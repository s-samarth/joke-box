"""Kinds of craft note: yours to add, rename and delete. Each picks a behaviour the app uses."""

import uuid

from fastapi import APIRouter
from sqlalchemy import func, select

from app.auth.deps import CurrentUser, DbSession, get_owned
from app.models import NoteKind
from app.schemas.craft import NoteKindIn, NoteKindOut
from app.services import craft_kinds as svc
from app.services.topics import commit_or_conflict

router = APIRouter(prefix="/api/craft-kinds", tags=["craft"])

CLASH = "A kind with that name already exists"


@router.get("", response_model=list[NoteKindOut])
def list_kinds(user: CurrentUser, db: DbSession) -> list[NoteKind]:
    """Your kinds in order. Someone signed in before kinds existed gets the starting four here."""
    svc.ensure_craft_kinds(db, user)
    db.commit()
    query = select(NoteKind).where(NoteKind.user_id == user.id)
    return list(db.scalars(query.order_by(NoteKind.position, NoteKind.created_at)))


@router.post("", response_model=NoteKindOut, status_code=201)
def create_kind(body: NoteKindIn, user: CurrentUser, db: DbSession) -> NoteKind:
    """A new kind goes last."""
    count = db.scalar(select(func.count()).where(NoteKind.user_id == user.id)) or 0
    kind = NoteKind(user_id=user.id, position=count, **body.model_dump())
    db.add(kind)
    commit_or_conflict(db, CLASH)
    return kind


@router.patch("/{kind_id}", response_model=NoteKindOut)
def update_kind(kind_id: uuid.UUID, body: NoteKindIn, user: CurrentUser, db: DbSession) -> NoteKind:
    kind = get_owned(db, NoteKind, kind_id, user)
    for field, value in body.model_dump().items():
        setattr(kind, field, value)
    commit_or_conflict(db, CLASH)
    return kind


@router.delete("/{kind_id}", status_code=204)
def delete_kind(
    kind_id: uuid.UUID, user: CurrentUser, db: DbSession, move_to: uuid.UUID | None = None
) -> None:
    """Its notes move to `move_to`, or to your first other kind."""
    svc.delete_kind(db, user, get_owned(db, NoteKind, kind_id, user), move_to)
