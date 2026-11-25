"""Joke statuses: Draft is the default and stays first; the rest can be renamed, merged,
deleted (their jokes go back to Draft) and arranged.

Moving jokes from one status to another doesn't touch their `updated_at`: the writing pulse
reads that as "when you last worked on it", and renaming a status isn't working on the joke.
"""

import uuid
from collections.abc import Sequence

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models import Joke, Status, User
from app.schemas.library import DEFAULT_STATUS, status_name
from app.services.jokes import get_or_create_status
from app.services.ordering import set_order


def is_default(status: Status) -> bool:
    return status.name.lower() == DEFAULT_STATUS.lower()


def ordered(db: Session, user: User) -> list[Status]:
    """The user's statuses with Draft first (made if missing), then the order they set."""
    get_or_create_status(db, user, DEFAULT_STATUS)
    rows = db.scalars(select(Status).where(Status.user_id == user.id).order_by(Status.position))
    return sorted(rows, key=lambda s: not is_default(s))


def _protect(status: Status, action: str) -> None:
    if is_default(status):
        raise HTTPException(400, f"Draft is where new jokes start, so it can't be {action}")


def _move_jokes(db: Session, user: User, source: Status, target: Status | None = None) -> None:
    """Move (or, with no target, just touch) the jokes on a status. Each goes up a version, so
    a save made before, still naming the old status, is a clash rather than bringing it back."""
    db.execute(
        update(Joke)
        .where(Joke.user_id == user.id, Joke.status_id == source.id)
        .values(
            status_id=(target or source).id, version=Joke.version + 1, updated_at=Joke.updated_at
        )
    )


def rename(db: Session, user: User, status: Status, new_name: str) -> None:
    """Rename a status; onto a name you already have, its jokes join that one (a merge)."""
    _protect(status, "renamed")
    new_name = status_name(new_name)
    target = db.scalar(
        select(Status).where(
            Status.user_id == user.id,
            func.lower(Status.name) == new_name.lower(),
            Status.id != status.id,
        )
    )
    if target is None:
        _move_jokes(db, user, status)
        status.name = new_name
    else:
        _move_jokes(db, user, status, target)
        db.delete(status)
    db.commit()


def delete(db: Session, user: User, status: Status) -> None:
    """Delete a status: its jokes, the Trash's included, go back to Draft."""
    _protect(status, "deleted")
    _move_jokes(db, user, status, get_or_create_status(db, user, DEFAULT_STATUS))
    db.delete(status)
    db.commit()


def reorder(db: Session, user: User, ids: Sequence[uuid.UUID]) -> None:
    """Number the statuses in the order given; Draft stays first whatever the order."""
    rows = ordered(db, user)
    draft = next(s for s in rows if is_default(s))
    set_order(rows, [draft.id, *(i for i in ids if i != draft.id)])
    db.commit()
