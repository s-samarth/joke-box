"""Saving bits: resolve type and status names, and keep the type list tidy."""

import uuid

from fastapi import HTTPException
from sqlalchemy import delete, exists, func, select
from sqlalchemy.orm import Session

from app.models import Bit, BitType, Status, Subtopic, Topic, User, bit_type_links
from app.models.base import written_at
from app.schemas.library import BitIn, BitOut


def to_out(bit: Bit) -> BitOut:
    """Flatten a bit for the API: type and status become plain names."""
    return BitOut(
        id=bit.id,
        setup=bit.setup,
        punchline=bit.punchline,
        topic_id=bit.topic_id,
        subtopic_id=bit.subtopic_id,
        types=[t.name for t in bit.types],
        status=bit.status.name if bit.status else None,
        strength=bit.strength,
        duration_seconds=bit.duration_seconds,
        hashtags=list(bit.hashtags or []),
        tag_lines=list(bit.tag_lines or []),
        clean_rating=bit.clean_rating,  # type: ignore[arg-type]
        language=bit.language,
        comments=bit.comments,
        version=bit.version,
        created_at=bit.created_at,
        updated_at=bit.updated_at,
    )


def get_or_create_type(db: Session, user: User, name: str) -> BitType:
    found = db.scalar(
        select(BitType).where(BitType.user_id == user.id, func.lower(BitType.name) == name.lower())
    )
    if found is None:
        found = BitType(user_id=user.id, name=name)
        db.add(found)
        db.flush()
    return found


def get_or_create_status(db: Session, user: User, name: str) -> Status:
    found = db.scalar(
        select(Status).where(Status.user_id == user.id, func.lower(Status.name) == name.lower())
    )
    if found is None:
        last = db.scalar(select(func.max(Status.position)).where(Status.user_id == user.id))
        found = Status(user_id=user.id, name=name, position=(last or 0) + 1)
        db.add(found)
        db.flush()
    return found


def check_placement(db: Session, user: User, data: BitIn) -> None:
    """The topic and subtopic must be the user's own, and the subtopic must sit in the topic."""
    topic = db.scalar(select(Topic).where(Topic.id == data.topic_id, Topic.user_id == user.id))
    if topic is None:
        raise HTTPException(422, "Unknown topic")
    if data.subtopic_id is not None:
        sub = db.get(Subtopic, data.subtopic_id)
        if sub is None or sub.topic_id != topic.id:
            raise HTTPException(422, "Subtopic does not belong to that topic")


def apply(db: Session, user: User, bit: Bit, data: BitIn) -> None:
    """Copy editor fields onto the bit, creating any new type or status by name."""
    check_placement(db, user, data)
    fields = data.model_dump(exclude={"types", "status", "created_at", "base_version"})
    for key, value in fields.items():
        setattr(bit, key, value)
    if data.created_at and bit.created_at is None:
        # A joke brought in with its old date (an import), or written offline, was last changed
        # when it was written, not when it reached the server.
        bit.created_at = bit.updated_at = written_at(data.created_at)
    seen: dict[str, BitType] = {}
    for name in data.types:
        if name.lower() != "undefined":
            seen.setdefault(name.lower(), get_or_create_type(db, user, name))
    bit.types = list(seen.values())
    bit.status = get_or_create_status(db, user, data.status) if data.status else None


def prune_unused_types(db: Session, user: User) -> None:
    """A type exists only while some bit uses it, as in the original app."""
    used = exists().where(bit_type_links.c.type_id == BitType.id)
    db.execute(delete(BitType).where(BitType.user_id == user.id, ~used))


CONFLICT = "This joke was changed on another device after you edited it."


def type_names(names: list[str]) -> set[str]:
    """Type names as apply() stores them: case-folded, without the placeholder."""
    return {n.lower() for n in names if n.lower() != "undefined"}


def same_content(bit: Bit, data: BitIn) -> bool:
    """Would this save leave the joke as it is? Then a stale version is harmless (a retry)."""
    now = to_out(bit)
    sent = data.model_dump(exclude={"types", "status", "created_at", "base_version"})
    return (
        all(getattr(now, k) == v for k, v in sent.items())
        and type_names(now.types) == type_names(data.types)
        and (now.status or "").lower() == (data.status or "").lower()
    )


def check_version(existing: Bit, data: BitIn) -> None:
    """Refuse an edit made from an older version that would overwrite someone else's change."""
    if data.base_version is None or data.base_version == existing.version:
        return
    if not same_content(existing, data):
        raise HTTPException(409, CONFLICT)


def save(db: Session, user: User, bit_id: uuid.UUID, data: BitIn, existing: Bit | None) -> Bit:
    """Create or update in one transaction."""
    if existing is not None:
        check_version(existing, data)
        existing.version += 1
    bit = existing or Bit(id=bit_id, user_id=user.id)
    apply(db, user, bit, data)
    db.add(bit)  # after apply, so lookups inside it don't flush a half-filled bit
    db.flush()
    prune_unused_types(db, user)
    db.commit()
    db.refresh(bit)
    return bit
