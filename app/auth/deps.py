"""Request dependencies: who is signed in, and fetching rows they own."""

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.models.base import OwnedMixin
from app.models.trash import INCLUDE_TRASHED, Trashable

DbSession = Annotated[Session, Depends(get_db)]


def today() -> str:
    """Today's date (UTC), the most a sign-in is renewed: once a day is plenty."""
    return datetime.now(UTC).date().isoformat()


def renew(request: Request) -> None:
    """Keep a sign-in alive while it's used. The session cookie is only sent again when the
    session changes, so without this it would run out 30 days after signing in however often
    the app is opened. Marking the day changes it, so the first request each day sends a fresh
    cookie, good for another 30 days."""
    if request.session.get("renewed") != today():
        request.session["renewed"] = today()


IN_TRASH = "This was moved to the Trash. Put it back from the Trash, then try again."


def current_user(request: Request, db: DbSession) -> User:
    """The signed-in user, from the id stored in the signed session cookie."""
    raw_id = request.session.get("user_id")
    if not raw_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    user = db.get(User, uuid.UUID(raw_id))
    if user is None:
        request.session.clear()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    renew(request)
    return user


CurrentUser = Annotated[User, Depends(current_user)]


def get_owned[T: OwnedMixin](
    db: Session, model: type[T], row_id: uuid.UUID, user: User, in_trash: bool = False
) -> T:
    """Load a row by id, or 404 if it doesn't exist or belongs to someone else. `in_trash`
    also finds it in the Trash: a link to a show in the Trash stays, so it's back on restore."""
    query = select(model).where(model.id == row_id, model.user_id == user.id)
    row = db.scalar(query.execution_options(**{INCLUDE_TRASHED: in_trash}))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{model.__name__} not found")
    return row


def find_owned[T: OwnedMixin](
    db: Session, model: type[T], row_id: uuid.UUID, user: User
) -> T | None:
    """Like get_owned for upserts: None if new, 404 if the id belongs to another user, 410 if
    it's in the Trash (a save made on another device after it was deleted). 410, not 409, so
    the app offers Retry (after putting it back) rather than Keep mine."""
    row = db.get(model, row_id, execution_options={INCLUDE_TRASHED: True})
    if row is not None and row.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{model.__name__} not found")
    if isinstance(row, Trashable) and row.deleted_at is not None:
        raise HTTPException(status.HTTP_410_GONE, IN_TRASH)
    return row
