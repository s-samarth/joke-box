"""Moving things to the Trash, restoring them, and erasing them for good.

A joke goes to the Trash with its rewrites (stamped with the same time), and comes back with
them. Its places in sets stay in the database, hidden while it's away. Anything in the Trash
for 30 days is erased the next time the Trash is opened.
"""

import uuid
from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import StaleDataError

from app.models import (
    Analysis,
    Bit,
    Brainstorm,
    CraftNote,
    Observation,
    PerformanceLog,
    User,
    VoiceNote,
    WatchItem,
    WritingSession,
)
from app.models.base import utcnow
from app.models.trash import INCLUDE_TRASHED, Trashable
from app.services.audio_store import AudioStore
from app.services.bits import prune_unused_types

KEEP_FOR = timedelta(days=30)

# The URL name of each kind, in the order the Trash shows them.
KINDS: dict[str, type[Trashable]] = {
    "jokes": Bit,
    "rewrites": Brainstorm,
    "observations": Observation,
    "brainstorms": WritingSession,
    "voice-notes": VoiceNote,
    "shows": PerformanceLog,
    "analyses": Analysis,
    "watchlist": WatchItem,
    "craft-notes": CraftNote,
}


def find_any[T: Trashable](db: Session, model: type[T], row_id: uuid.UUID, user: User) -> T | None:
    """The user's row with this id, in the Trash or not."""
    query = select(model).where(model.id == row_id, model.user_id == user.id)  # type: ignore[attr-defined]
    return db.scalar(query.execution_options(**{INCLUDE_TRASHED: True}))


def trashed[T: Trashable](db: Session, model: type[T], user: User) -> list[T]:
    """Everything of one kind in the user's Trash, most recently deleted first."""
    query = (
        select(model)
        .where(model.user_id == user.id, model.deleted_at.is_not(None))  # type: ignore[attr-defined]
        .order_by(model.deleted_at.desc())
    )
    return list(db.scalars(query.execution_options(**{INCLUDE_TRASHED: True})))


def trashed_bit_ids(db: Session, user: User) -> set[uuid.UUID]:
    """Jokes in the Trash: sets keep their places but don't show them."""
    query = select(Bit.id).where(Bit.user_id == user.id, Bit.deleted_at.is_not(None))
    return set(db.scalars(query.execution_options(**{INCLUDE_TRASHED: True})))


def rewrites_of(db: Session, bit: Bit, deleted_at: object) -> list[Brainstorm]:
    """The joke's rewrites whose deleted_at matches: None for live ones, or the joke's time."""
    query = select(Brainstorm).where(Brainstorm.bit_id == bit.id)
    query = query.where(
        Brainstorm.deleted_at.is_(None)
        if deleted_at is None
        else Brainstorm.deleted_at == deleted_at
    )
    return list(db.scalars(query.execution_options(**{INCLUDE_TRASHED: True})))


def move_to_trash(db: Session, user: User, model: type[Trashable], row_id: uuid.UUID) -> None:
    """Move a row to the Trash. Already there, or already gone, is fine: replays are safe."""
    row = db.get(model, row_id, execution_options={INCLUDE_TRASHED: True})
    if row is not None and row.user_id != user.id:  # type: ignore[attr-defined]
        raise HTTPException(404, f"{model.__name__} not found")
    if row is None or row.deleted_at is not None:
        return
    row.deleted_at = utcnow()
    if isinstance(row, Bit):
        for rewrite in rewrites_of(db, row, None):
            rewrite.deleted_at = row.deleted_at
    db.commit()


def restore(db: Session, user: User, model: type[Trashable], row_id: uuid.UUID) -> None:
    """Put a row back where it was. A joke brings back the rewrites that went with it."""
    row = find_any(db, model, row_id, user)
    if row is None:
        raise HTTPException(404, "It's no longer in the Trash")
    if row.deleted_at is None:
        return
    if isinstance(row, Brainstorm) and find_any(db, Bit, row.bit_id, user).deleted_at:  # type: ignore[union-attr]
        raise HTTPException(409, "Its joke is in the Trash. Put the joke back first.")
    if isinstance(row, Bit):
        for rewrite in rewrites_of(db, row, row.deleted_at):
            rewrite.deleted_at = None
    row.deleted_at = None
    db.commit()


def erase(db: Session, user: User, row: Trashable, store: AudioStore) -> None:
    """Delete one trashed row for good, with its recording if it's a voice note."""
    if isinstance(row, VoiceNote) and row.audio_path:
        store.delete(row.audio_path)
    db.delete(row)
    db.flush()
    if isinstance(row, Bit):
        prune_unused_types(db, user)


def delete_forever(
    db: Session, user: User, model: type[Trashable], row_id: uuid.UUID, store: AudioStore
) -> None:
    row = find_any(db, model, row_id, user)
    if row is not None and row.deleted_at is not None:
        erase(db, user, row, store)
        db.commit()


def empty(db: Session, user: User, store: AudioStore, older_than: timedelta | None = None) -> None:
    """Erase everything in the Trash, or only what has waited longer than `older_than`."""
    cutoff = utcnow() - older_than if older_than else None
    try:
        for model in KINDS.values():
            for row in trashed(db, model, user):
                if cutoff is None or row.deleted_at <= cutoff:  # type: ignore[operator]
                    erase(db, user, row, store)
        db.commit()
    except StaleDataError:
        db.rollback()  # another request (a second tab) erased them first


def purge_expired(db: Session, user: User, store: AudioStore) -> None:
    empty(db, user, store, older_than=KEEP_FOR)
