"""Kinds of craft note: the starting four everyone gets, and deleting one without losing notes."""

import uuid

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models import CraftNote, NoteKind, User

# (name, behaviour). Users can rename these, add their own and delete them.
DEFAULT_KINDS = [
    ("Checklist", "checklist"),
    ("Technique", "technique"),
    ("Reference", "reference"),
    ("Path", "path"),
]


def ensure_craft_kinds(db: Session, user: User) -> None:
    """Give a user the starting kinds if they have none. Doesn't commit."""
    if db.scalar(select(func.count()).where(NoteKind.user_id == user.id)):
        return
    for position, (name, behaviour) in enumerate(DEFAULT_KINDS):
        db.add(NoteKind(user_id=user.id, name=name, behaviour=behaviour, position=position))
    db.flush()


def delete_kind(db: Session, user: User, kind: NoteKind, move_to: uuid.UUID | None) -> None:
    """Move the kind's notes to another kind, then delete it. The last kind can't go."""
    others = list(
        db.scalars(
            select(NoteKind)
            .where(NoteKind.user_id == user.id, NoteKind.id != kind.id)
            .order_by(NoteKind.position)
        )
    )
    if not others:
        raise HTTPException(400, "Keep at least one kind")
    target = next((k for k in others if k.id == move_to), None)
    if move_to is not None and target is None:
        raise HTTPException(404, "Not found")
    target = target or others[0]
    db.execute(
        update(CraftNote)
        .where(CraftNote.user_id == user.id, CraftNote.kind_id == kind.id)
        .values(kind_id=target.id)
    )
    db.delete(kind)
    db.commit()
