"""Saving jokes: resolve type and status names, and keep the type list tidy."""

import uuid

from fastapi import HTTPException
from sqlalchemy import delete, exists, func, select
from sqlalchemy.orm import Session

from app.models import Joke, JokeType, Premise, Status, Subtopic, Topic, User, joke_type_links
from app.models.base import written_at
from app.schemas.library import JokeIn, JokeOut, status_name
from app.services import chains, type_colors


def to_out(joke: Joke) -> JokeOut:
    """Flatten a joke for the API: type and status become plain names."""
    return JokeOut(
        id=joke.id,
        setup=joke.setup,
        punchline=joke.punchline,
        topic_id=joke.topic_id,
        subtopic_id=joke.subtopic_id,
        premise_id=joke.premise_id,
        types=[t.name for t in joke.types],
        status=joke.status.name if joke.status else None,
        strength=joke.strength,
        duration_seconds=joke.duration_seconds,
        hashtags=list(joke.hashtags or []),
        tag_lines=list(joke.tag_lines or []),
        clean_rating=joke.clean_rating,  # type: ignore[arg-type]
        language=joke.language,
        comments=joke.comments,
        follows_id=joke.follows_id,
        version=joke.version,
        created_at=joke.created_at,
        updated_at=joke.updated_at,
    )


def get_or_create_type(db: Session, user: User, name: str) -> JokeType:
    found = db.scalar(
        select(JokeType).where(
            JokeType.user_id == user.id, func.lower(JokeType.name) == name.lower()
        )
    )
    if found is None:
        found = JokeType(user_id=user.id, name=name)
        db.add(found)
        db.flush()
        type_colors.ensure_color(db, user, name)
    return found


def get_or_create_status(db: Session, user: User, name: str) -> Status:
    name = status_name(name)
    found = db.scalar(
        select(Status).where(Status.user_id == user.id, func.lower(Status.name) == name.lower())
    )
    if found is None:
        last = db.scalar(select(func.max(Status.position)).where(Status.user_id == user.id))
        found = Status(user_id=user.id, name=name, position=(last or 0) + 1)
        db.add(found)
        db.flush()
    return found


def check_placement(db: Session, user: User, data: JokeIn) -> None:
    """The topic and subtopic must be the user's own, and the subtopic must sit in the topic."""
    topic = db.scalar(select(Topic).where(Topic.id == data.topic_id, Topic.user_id == user.id))
    if topic is None:
        raise HTTPException(422, "Unknown topic")
    if data.subtopic_id is not None:
        sub = db.get(Subtopic, data.subtopic_id)
        if sub is None or sub.topic_id != topic.id:
            raise HTTPException(422, "Subtopic does not belong to that topic")


def check_premise(db: Session, user: User, data: JokeIn) -> None:
    """Any of the user's premises will do, whatever its topic. One deleted since the edit was
    made (a save waiting offline) is dropped rather than refused."""
    if data.premise_id is None:
        return
    premise = db.get(Premise, data.premise_id)
    if premise is None:
        data.premise_id = None
    elif premise.user_id != user.id:
        raise HTTPException(422, "Unknown premise")


def plain_fields(data: JokeIn) -> dict[str, object]:
    """The fields copied as they are. An app too old to know about chains or premises leaves
    follows_id or premise_id out, and then the link is kept rather than cleared."""
    skip = {"types", "status", "created_at", "base_version"}
    for link in ("follows_id", "premise_id"):
        if link not in data.model_fields_set:
            skip.add(link)
    return data.model_dump(exclude=skip)


def apply(db: Session, user: User, joke: Joke, data: JokeIn) -> None:
    """Copy editor fields onto the joke, creating any new type or status by name."""
    check_placement(db, user, data)
    check_premise(db, user, data)
    fields = plain_fields(data)
    if "follows_id" in fields:
        chains.check_follows(db, user, joke.id, data.follows_id)
    for key, value in fields.items():
        setattr(joke, key, value)
    if data.created_at and joke.created_at is None:
        # A joke brought in with its old date (an import), or written offline, was last changed
        # when it was written, not when it reached the server.
        joke.created_at = joke.updated_at = written_at(data.created_at)
    seen: dict[str, JokeType] = {}
    for name in data.types:
        if name.lower() != "undefined":
            seen.setdefault(name.lower(), get_or_create_type(db, user, name))
    joke.types = list(seen.values())
    joke.status = get_or_create_status(db, user, data.status)


def prune_unused_types(db: Session, user: User) -> None:
    """A type exists only while some joke uses it, as in the original app."""
    used = exists().where(joke_type_links.c.type_id == JokeType.id)
    db.execute(delete(JokeType).where(JokeType.user_id == user.id, ~used))


CONFLICT = "This joke was changed on another device after you edited it."


def type_names(names: list[str]) -> set[str]:
    """Type names as apply() stores them: case-folded, without the placeholder."""
    return {n.lower() for n in names if n.lower() != "undefined"}


def same_content(joke: Joke, data: JokeIn) -> bool:
    """Would this save leave the joke as it is? Then a stale version is harmless (a retry)."""
    now = to_out(joke)
    return (
        all(getattr(now, k) == v for k, v in plain_fields(data).items())
        and type_names(now.types) == type_names(data.types)
        and (now.status or "").lower() == data.status.lower()
    )


def check_version(existing: Joke, data: JokeIn) -> None:
    """Refuse an edit made from an older version that would overwrite someone else's change."""
    if data.base_version is None or data.base_version == existing.version:
        return
    if not same_content(existing, data):
        raise HTTPException(409, CONFLICT)


def save(db: Session, user: User, joke_id: uuid.UUID, data: JokeIn, existing: Joke | None) -> Joke:
    """Create or update in one transaction."""
    if existing is not None:
        check_version(existing, data)
        existing.version += 1
    joke = existing or Joke(id=joke_id, user_id=user.id)
    apply(db, user, joke, data)
    db.add(joke)  # after apply, so lookups inside it don't flush a half-filled joke
    db.flush()
    prune_unused_types(db, user)
    db.commit()
    db.refresh(joke)
    return joke
