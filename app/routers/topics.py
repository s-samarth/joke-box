"""Topics, subtopics, types and statuses."""

import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.auth.deps import CurrentUser, DbSession, get_owned
from app.models import BitType, Status, Subtopic, Topic
from app.schemas.library import NamedOut, NameIn, SubtopicOut, TopicOut
from app.services import topics as svc
from app.services.bits import get_or_create_status

router = APIRouter(prefix="/api", tags=["library"])


@router.get("/topics", response_model=list[TopicOut])
def list_topics(user: CurrentUser, db: DbSession) -> list[Topic]:
    query = (
        select(Topic)
        .where(Topic.user_id == user.id)
        .options(selectinload(Topic.subtopics))
        .order_by(Topic.is_system.desc(), Topic.name)
    )
    return list(db.scalars(query))


@router.post("/topics", response_model=TopicOut, status_code=201)
def create_topic(body: NameIn, user: CurrentUser, db: DbSession) -> Topic:
    topic = Topic(user_id=user.id, name=body.name)
    db.add(topic)
    svc.commit_or_conflict(db, "A topic with that name already exists")
    return topic


@router.patch("/topics/{topic_id}", response_model=TopicOut)
def rename_topic(topic_id: uuid.UUID, body: NameIn, user: CurrentUser, db: DbSession) -> Topic:
    topic = get_owned(db, Topic, topic_id, user)
    if topic.is_system:
        raise HTTPException(400, "Thoughts can't be renamed")
    topic.name = body.name
    svc.commit_or_conflict(db, "A topic with that name already exists")
    return topic


@router.delete("/topics/{topic_id}", status_code=204)
def delete_topic(topic_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    svc.delete_topic(db, user, get_owned(db, Topic, topic_id, user))


@router.post("/topics/{topic_id}/subtopics", response_model=SubtopicOut, status_code=201)
def create_subtopic(
    topic_id: uuid.UUID, body: NameIn, user: CurrentUser, db: DbSession
) -> Subtopic:
    topic = get_owned(db, Topic, topic_id, user)
    sub = Subtopic(user_id=user.id, topic_id=topic.id, name=body.name)
    db.add(sub)
    svc.commit_or_conflict(db, "That subtopic already exists")
    return sub


@router.patch("/subtopics/{sub_id}", response_model=SubtopicOut)
def rename_subtopic(sub_id: uuid.UUID, body: NameIn, user: CurrentUser, db: DbSession) -> Subtopic:
    sub = get_owned(db, Subtopic, sub_id, user)
    sub.name = body.name
    svc.commit_or_conflict(db, "That subtopic already exists")
    return sub


@router.delete("/subtopics/{sub_id}", status_code=204)
def delete_subtopic(sub_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    svc.delete_subtopic(db, user, get_owned(db, Subtopic, sub_id, user))


@router.get("/types", response_model=list[NamedOut])
def list_types(user: CurrentUser, db: DbSession) -> list[BitType]:
    return list(
        db.scalars(select(BitType).where(BitType.user_id == user.id).order_by(BitType.name))
    )


@router.patch("/types/{type_id}", status_code=204)
def rename_type(type_id: uuid.UUID, body: NameIn, user: CurrentUser, db: DbSession) -> None:
    svc.rename_type(db, user, get_owned(db, BitType, type_id, user), body.name)


@router.delete("/types/{type_id}", status_code=204)
def delete_type(type_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    """Bits keep their other types; a bit left with none shows as Undefined."""
    db.delete(get_owned(db, BitType, type_id, user))
    db.commit()


@router.get("/statuses", response_model=list[NamedOut])
def list_statuses(user: CurrentUser, db: DbSession) -> list[Status]:
    query = select(Status).where(Status.user_id == user.id).order_by(Status.position)
    return list(db.scalars(query))


@router.post("/statuses", response_model=NamedOut, status_code=201)
def create_status(body: NameIn, user: CurrentUser, db: DbSession) -> Status:
    status = get_or_create_status(db, user, body.name)
    db.commit()
    return status
