"""Request dependencies: who is signed in, and fetching rows they own."""

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.models.base import OwnedMixin

DbSession = Annotated[Session, Depends(get_db)]


def current_user(request: Request, db: DbSession) -> User:
    """The signed-in user, from the id stored in the signed session cookie."""
    raw_id = request.session.get("user_id")
    if not raw_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    user = db.get(User, uuid.UUID(raw_id))
    if user is None:
        request.session.clear()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not signed in")
    return user


CurrentUser = Annotated[User, Depends(current_user)]


def get_owned[T: OwnedMixin](db: Session, model: type[T], row_id: uuid.UUID, user: User) -> T:
    """Load a row by id, or 404 if it doesn't exist or belongs to someone else."""
    row = db.scalar(select(model).where(model.id == row_id, model.user_id == user.id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{model.__name__} not found")
    return row


def find_owned[T: OwnedMixin](
    db: Session, model: type[T], row_id: uuid.UUID, user: User
) -> T | None:
    """Like get_owned for upserts: None if new, 404 if the id belongs to another user."""
    row = db.get(model, row_id)
    if row is not None and row.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"{model.__name__} not found")
    return row
