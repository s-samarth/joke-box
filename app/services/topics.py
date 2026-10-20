"""Topic and type changes that touch many bits, each done in one transaction."""

from fastapi import HTTPException
from sqlalchemy import delete, func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.bootstrap import random_topic_for
from app.models import Bit, BitType, Subtopic, Topic, User, bit_type_links, performance_log_topics


def commit_or_conflict(db: Session, message: str) -> None:
    """Commit, turning a unique-name clash into a 409 the UI can show."""
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, message) from exc


def delete_topic(db: Session, user: User, topic: Topic) -> None:
    """Move the topic's bits (and log links) to Random, clear their subtopic, then delete it."""
    if topic.is_system:
        raise HTTPException(400, "Thoughts can't be deleted")
    random_topic = random_topic_for(db, user)
    db.execute(
        update(Bit)
        .where(Bit.user_id == user.id, Bit.topic_id == topic.id)
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
    """Bits keep their topic and lose the subtopic."""
    db.execute(
        update(Bit)
        .where(Bit.user_id == user.id, Bit.subtopic_id == sub.id)
        .values(subtopic_id=None)
    )
    db.delete(sub)
    db.commit()


def rename_type(db: Session, user: User, bit_type: BitType, new_name: str) -> None:
    """Rename a type; if the new name already exists, merge the two."""
    target = db.scalar(
        select(BitType).where(
            BitType.user_id == user.id,
            func.lower(BitType.name) == new_name.lower(),
            BitType.id != bit_type.id,
        )
    )
    if target is None:
        bit_type.name = new_name
        db.commit()
        return
    moving = select(bit_type_links.c.bit_id).where(bit_type_links.c.type_id == bit_type.id)
    present = select(bit_type_links.c.bit_id).where(bit_type_links.c.type_id == target.id)
    for (bit_id,) in db.execute(moving.except_(present)).all():
        db.execute(bit_type_links.insert().values(bit_id=bit_id, type_id=target.id))
    db.execute(delete(bit_type_links).where(bit_type_links.c.type_id == bit_type.id))
    db.delete(bit_type)
    db.commit()
