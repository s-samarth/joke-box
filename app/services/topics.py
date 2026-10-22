"""Topic and type changes that touch many jokes, each done in one transaction."""

from fastapi import HTTPException
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.bootstrap import random_topic_for
from app.models import (
    Joke,
    JokeType,
    Subtopic,
    Topic,
    User,
    joke_type_links,
    performance_log_topics,
)
from app.services import type_colors


def commit_or_conflict(db: Session, message: str) -> None:
    """Commit, turning a unique-name clash into a 409 the UI can show."""
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, message) from exc


def delete_topic(db: Session, user: User, topic: Topic) -> None:
    """Move the topic's jokes (and log links) to Random, clear their subtopic, then delete it."""
    if topic.is_system:
        raise HTTPException(400, "Thoughts can't be deleted")
    random_topic = random_topic_for(db, user)
    db.execute(
        update(Joke)
        .where(Joke.user_id == user.id, Joke.topic_id == topic.id)
        .values(topic_id=random_topic.id, subtopic_id=None)
    )
    linked = select(performance_log_topics.c.log_id).where(
        performance_log_topics.c.topic_id == topic.id
    )
    already = select(performance_log_topics.c.log_id).where(
        performance_log_topics.c.topic_id == random_topic.id
    )
    for (log_id,) in db.execute(linked.except_(already)).all():
        db.execute(performance_log_topics.insert().values(log_id=log_id, topic_id=random_topic.id))
    db.delete(topic)
    db.commit()


def delete_subtopic(db: Session, user: User, sub: Subtopic) -> None:
    """Jokes keep their topic and lose the subtopic."""
    db.execute(
        update(Joke)
        .where(Joke.user_id == user.id, Joke.subtopic_id == sub.id)
        .values(subtopic_id=None)
    )
    db.delete(sub)
    db.commit()


def rename_type(db: Session, user: User, joke_type: JokeType, new_name: str) -> None:
    """Rename a type; if the new name already exists, merge the two."""
    type_colors.rename(db, user, joke_type.name, new_name)
    target = db.scalar(
        select(JokeType).where(
            JokeType.user_id == user.id,
            func.lower(JokeType.name) == new_name.lower(),
            JokeType.id != joke_type.id,
        )
    )
    if target is None:
        joke_type.name = new_name
        db.commit()
        return
    moving = select(joke_type_links.c.joke_id).where(joke_type_links.c.type_id == joke_type.id)
    present = select(joke_type_links.c.joke_id).where(joke_type_links.c.type_id == target.id)
    for (joke_id,) in db.execute(moving.except_(present)).all():
        db.execute(joke_type_links.insert().values(joke_id=joke_id, type_id=target.id))
    db.execute(delete(joke_type_links).where(joke_type_links.c.type_id == joke_type.id))
    db.delete(joke_type)
    db.commit()
