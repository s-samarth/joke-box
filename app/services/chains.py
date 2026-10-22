"""Joke chains: a joke can follow one other joke, and many jokes can follow the same one."""

import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Bit, User
from app.models.trash import INCLUDE_TRASHED

LOOP = "A joke can't follow itself or a joke that comes after it."


def check_follows(db: Session, user: User, bit_id: uuid.UUID, follows_id: uuid.UUID | None) -> None:
    """The joke followed must be the user's own, and walking back from it must not reach this one.

    A joke in the Trash still counts, so a follow-up keeps its link while the one before is away.
    """
    seen = {bit_id}
    current = follows_id
    while current is not None:
        if current in seen:
            raise HTTPException(422, LOOP)
        seen.add(current)
        query = select(Bit.user_id, Bit.follows_id).where(Bit.id == current)
        row = db.execute(query.execution_options(**{INCLUDE_TRASHED: True})).first()
        if row is None or row.user_id != user.id:
            raise HTTPException(422, "Unknown joke to follow")
        current = row.follows_id
