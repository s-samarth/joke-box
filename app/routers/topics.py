"""Topics, subtopics, types and statuses."""

import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.auth.deps import CurrentUser, DbSession, get_owned
from app.models import JokeType, Status, Subtopic, Topic
from app.schemas.library import (
    NamedOut,
    NameIn,
    OrderIn,
    SubtopicOut,
    TopicOut,
    TypeColorIn,
    TypeOut,
)
from app.services import topics as svc
from app.services import type_colors
from app.services.jokes import get_or_create_status
from app.services.ordering import next_position, set_order

router = APIRouter(prefix="/api", tags=["library"])


@router.get("/topics", response_model=list[TopicOut])
def list_topics(user: CurrentUser, db: DbSession) -> list[Topic]:
    query = (
        select(Topic)
        .where(Topic.user_id == user.id)
        .options(selectinload(Topic.subtopics))
        .order_by(Topic.is_system.desc(), Topic.position, Topic.name)
    )
    return list(db.scalars(query))


@router.post("/topics", response_model=TopicOut, status_code=201)
def create_topic(body: NameIn, user: CurrentUser, db: DbSession) -> Topic:
    position = next_position(db, Topic.position, Topic.user_id == user.id)
    topic = Topic(user_id=user.id, name=body.name, position=position)
    db.add(topic)
    svc.commit_or_conflict(db, "A topic with that name already exists")
    return topic


@router.put("/topics/order", status_code=204)
def reorder_topics(body: OrderIn, user: CurrentUser, db: DbSession) -> None:
    """Thoughts stays first whatever the order."""
    set_order(list(db.scalars(select(Topic).where(Topic.user_id == user.id))), body.ids)
    db.commit()


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
    position = next_position(db, Subtopic.position, Subtopic.topic_id == topic.id)
    sub = Subtopic(user_id=user.id, topic_id=topic.id, name=body.name, position=position)
    db.add(sub)
    svc.commit_or_conflict(db, "That subtopic already exists")
    return sub


@router.put("/topics/{topic_id}/subtopics/order", status_code=204)
def reorder_subtopics(topic_id: uuid.UUID, body: OrderIn, user: CurrentUser, db: DbSession) -> None:
    set_order(get_owned(db, Topic, topic_id, user).subtopics, body.ids)
    db.commit()


@router.patch("/subtopics/{sub_id}", response_model=SubtopicOut)
def rename_subtopic(sub_id: uuid.UUID, body: NameIn, user: CurrentUser, db: DbSession) -> Subtopic:
    sub = get_owned(db, Subtopic, sub_id, user)
    sub.name = body.name
    svc.commit_or_conflict(db, "That subtopic already exists")
    return sub


@router.delete("/subtopics/{sub_id}", status_code=204)
def delete_subtopic(sub_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    svc.delete_subtopic(db, user, get_owned(db, Subtopic, sub_id, user))


@router.get("/types", response_model=list[TypeOut])
def list_types(user: CurrentUser, db: DbSession) -> list[TypeOut]:
    types = db.scalars(select(JokeType).where(JokeType.user_id == user.id).order_by(JokeType.name))
    colors = type_colors.colors_by_name(db, user)
    return [
        TypeOut(
            id=t.id,
            name=t.name,
            color=colors.get(t.name.lower()) or type_colors.pick_color(t.name, set()),
        )
        for t in types
    ]


@router.put("/types/color", status_code=204)
def set_type_color(body: TypeColorIn, user: CurrentUser, db: DbSession) -> None:
    type_colors.set_color(db, user, body.name, body.color)
    db.commit()


@router.patch("/types/{type_id}", status_code=204)
def rename_type(type_id: uuid.UUID, body: NameIn, user: CurrentUser, db: DbSession) -> None:
    svc.rename_type(db, user, get_owned(db, JokeType, type_id, user), body.name)


@router.delete("/types/{type_id}", status_code=204)
def delete_type(type_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    """Jokes keep their other types; a joke left with none shows as Undefined."""
    db.delete(get_owned(db, JokeType, type_id, user))
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
