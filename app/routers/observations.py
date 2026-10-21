"""Observations and their own topics (separate from joke topics)."""

import uuid

from fastapi import APIRouter
from sqlalchemy import select, update

from app.auth.deps import CurrentUser, DbSession, find_owned, get_owned
from app.models import Observation, ObservationTopic
from app.models.base import written_at
from app.schemas.library import NamedOut, NameIn
from app.schemas.notebook import ObservationIn, ObservationOut
from app.services.topics import commit_or_conflict

router = APIRouter(prefix="/api", tags=["observations"])

TOPIC_CLASH = "An observation topic with that name already exists"


@router.get("/observations", response_model=list[ObservationOut])
def list_observations(user: CurrentUser, db: DbSession) -> list[Observation]:
    query = (
        select(Observation)
        .where(Observation.user_id == user.id)
        .order_by(Observation.created_at.desc())
    )
    return list(db.scalars(query))


@router.put("/observations/{observation_id}", response_model=ObservationOut)
def put_observation(
    observation_id: uuid.UUID, body: ObservationIn, user: CurrentUser, db: DbSession
) -> Observation:
    """Create or update. The client picks the id, so a retried offline save never duplicates."""
    if body.topic_id is not None:
        get_owned(db, ObservationTopic, body.topic_id, user)
    observation = find_owned(db, Observation, observation_id, user)
    if observation is None:
        observation = Observation(id=observation_id, user_id=user.id)
        if body.created_at:
            observation.created_at = written_at(body.created_at)
        db.add(observation)
    observation.text = body.text
    observation.topic_id = body.topic_id
    db.commit()
    db.refresh(observation)
    return observation


@router.delete("/observations/{observation_id}", status_code=204)
def delete_observation(observation_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    observation = find_owned(db, Observation, observation_id, user)
    if observation is None:
        return  # already gone: a replayed offline delete is fine
    db.delete(observation)
    db.commit()


@router.get("/observation-topics", response_model=list[NamedOut])
def list_observation_topics(user: CurrentUser, db: DbSession) -> list[ObservationTopic]:
    query = (
        select(ObservationTopic)
        .where(ObservationTopic.user_id == user.id)
        .order_by(ObservationTopic.name)
    )
    return list(db.scalars(query))


@router.post("/observation-topics", response_model=NamedOut, status_code=201)
def create_observation_topic(body: NameIn, user: CurrentUser, db: DbSession) -> ObservationTopic:
    topic = ObservationTopic(user_id=user.id, name=body.name)
    db.add(topic)
    commit_or_conflict(db, TOPIC_CLASH)
    return topic


@router.patch("/observation-topics/{topic_id}", response_model=NamedOut)
def rename_observation_topic(
    topic_id: uuid.UUID, body: NameIn, user: CurrentUser, db: DbSession
) -> ObservationTopic:
    topic = get_owned(db, ObservationTopic, topic_id, user)
    topic.name = body.name
    commit_or_conflict(db, TOPIC_CLASH)
    return topic


@router.delete("/observation-topics/{topic_id}", status_code=204)
def delete_observation_topic(topic_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    """The topic goes; its observations stay, with no topic."""
    topic = get_owned(db, ObservationTopic, topic_id, user)
    db.execute(
        update(Observation)
        .where(Observation.user_id == user.id, Observation.topic_id == topic.id)
        .values(topic_id=None)
    )
    db.delete(topic)
    db.commit()
