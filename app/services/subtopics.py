"""Every topic's default subtopic, "Subtopic unknown".

A joke filed under a topic with no subtopic picked goes here, so "no subtopic" and "unknown"
never mean two different things. It's protected like Random: it can't be renamed or deleted,
and it sorts last. A topic gets it when it's made, or the first time a joke needs it.
"""

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Subtopic, Topic, User
from app.schemas.library import JokeIn

UNKNOWN = "Subtopic unknown"


def unknown_for(db: Session, user: User, topic: Topic) -> Subtopic:
    """The topic's default subtopic, made if it's missing. One already called that (made by
    hand before it was protected) becomes the default rather than clashing with it."""
    found = db.scalar(
        select(Subtopic).where(Subtopic.topic_id == topic.id, Subtopic.is_system.is_(True))
    )
    if found is None:
        named = select(Subtopic).where(
            Subtopic.topic_id == topic.id, func.lower(Subtopic.name) == UNKNOWN.lower()
        )
        found = db.scalar(named) or Subtopic(user_id=user.id, topic_id=topic.id, name=UNKNOWN)
        found.is_system = True
        db.add(found)
        db.flush()
    return found


def fill(db: Session, user: User, data: JokeIn) -> None:
    """A joke saved with a topic and no subtopic goes to that topic's default. A topic that
    isn't the user's is left for the save to refuse."""
    if data.subtopic_id is not None:
        return
    topic = db.scalar(select(Topic).where(Topic.id == data.topic_id, Topic.user_id == user.id))
    if topic is not None:
        data.subtopic_id = unknown_for(db, user, topic).id


def ensure_all(db: Session, user: User) -> None:
    """Every one of the user's topics has its default (after an import)."""
    for topic in db.scalars(select(Topic).where(Topic.user_id == user.id)):
        unknown_for(db, user, topic)


def protect(sub: Subtopic, doing: str) -> None:
    if sub.is_system:
        raise HTTPException(400, f"{UNKNOWN} can't be {doing}: it's where jokes go by default")
