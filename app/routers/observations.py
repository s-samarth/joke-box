"""Observations, filed under a joke topic and a kind of their own.

Kinds ("Set ideas", "Questions") are served at /api/observation-topics, the path apps from before
kinds already use.
"""

import uuid

from fastapi import APIRouter
from sqlalchemy import select, update

from app.auth.deps import CurrentUser, DbSession, find_owned, get_owned
from app.models import Observation, ObservationTopic, Topic
from app.models.base import written_at
from app.schemas.library import NamedOut, NameIn, OrderIn
from app.schemas.notebook import ObservationIn, ObservationOut
from app.services.clashes import OBSERVATION_CLASH, check_fields
from app.services.ordering import next_position, set_order
from app.services.topics import commit_or_conflict
from app.services.trash import move_to_trash

router = APIRouter(prefix="/api", tags=["observations"])

TOPIC_CLASH = "A kind with that name already exists"


@router.get("/observations", response_model=list[ObservationOut])
def list_observations(user: CurrentUser, db: DbSession) -> list[Observation]:
    query = (
        select(Observation)
        .where(Observation.user_id == user.id)
        .order_by(Observation.created_at.desc())
    )
    return list(db.scalars(query))


def saved_fields(
    body: ObservationIn, stored: Observation | None
) -> tuple[uuid.UUID | None, uuid.UUID | None]:
    """The kind and topic a save asks for. A field it leaves out keeps what's stored.

    A save without `kind_id` comes from an app made before kinds, whose `topic_id` meant the
    kind; the topic it never knew about stays as it is.
    """
    keep_topic = stored.topic_id if stored else None
    if "kind_id" not in body.model_fields_set:
        return body.topic_id, keep_topic
    topic_id = body.topic_id if "topic_id" in body.model_fields_set else keep_topic
    return body.kind_id, topic_id


@router.put("/observations/{observation_id}", response_model=ObservationOut)
def put_observation(
    observation_id: uuid.UUID, body: ObservationIn, user: CurrentUser, db: DbSession
) -> Observation:
    """Create or update. The client picks the id, so a retried offline save never duplicates."""
    observation = find_owned(db, Observation, observation_id, user)
    kind_id, topic_id = saved_fields(body, observation)
    if kind_id is not None:
        get_owned(db, ObservationTopic, kind_id, user)
    if topic_id is not None:
        get_owned(db, Topic, topic_id, user)
    if observation is None:
        observation = Observation(id=observation_id, user_id=user.id)
        if body.created_at:
            observation.created_at = written_at(body.created_at)
        db.add(observation)
    else:
        fields = {"text": body.text, "kind_id": kind_id, "topic_id": topic_id}
        check_fields(observation, body.base_version, fields, OBSERVATION_CLASH)
    observation.text = body.text
    observation.kind_id = kind_id
    observation.topic_id = topic_id
    db.commit()
    db.refresh(observation)
    return observation


@router.delete("/observations/{observation_id}", status_code=204)
def delete_observation(observation_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    move_to_trash(db, user, Observation, observation_id)


@router.get("/observation-topics", response_model=list[NamedOut])
def list_observation_topics(user: CurrentUser, db: DbSession) -> list[ObservationTopic]:
    query = (
        select(ObservationTopic)
        .where(ObservationTopic.user_id == user.id)
        .order_by(ObservationTopic.position, ObservationTopic.name)
    )
    return list(db.scalars(query))


@router.post("/observation-topics", response_model=NamedOut, status_code=201)
def create_observation_topic(body: NameIn, user: CurrentUser, db: DbSession) -> ObservationTopic:
    position = next_position(db, ObservationTopic.position, ObservationTopic.user_id == user.id)
    topic = ObservationTopic(user_id=user.id, name=body.name, position=position)
    db.add(topic)
    commit_or_conflict(db, TOPIC_CLASH)
    return topic


@router.put("/observation-topics/order", status_code=204)
def reorder_observation_topics(body: OrderIn, user: CurrentUser, db: DbSession) -> None:
    query = select(ObservationTopic).where(ObservationTopic.user_id == user.id)
    set_order(list(db.scalars(query)), body.ids)
    db.commit()


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
    """The kind goes; its observations stay, with no kind."""
    topic = get_owned(db, ObservationTopic, topic_id, user)
    db.execute(
        update(Observation)
        .where(Observation.user_id == user.id, Observation.kind_id == topic.id)
        .values(kind_id=None)
    )
    db.delete(topic)
    db.commit()
