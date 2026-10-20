"""Bits: list, read, create-or-update by client id, delete."""

import uuid

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.auth.deps import CurrentUser, DbSession, find_owned, get_owned
from app.models import Bit
from app.schemas.library import BitIn, BitOut
from app.services import bits as svc

router = APIRouter(prefix="/api/bits", tags=["bits"])


@router.get("", response_model=list[BitOut])
def list_bits(user: CurrentUser, db: DbSession) -> list[BitOut]:
    """The whole library. Searching and filtering happen in the browser, so they work offline."""
    query = (
        select(Bit)
        .where(Bit.user_id == user.id)
        .options(selectinload(Bit.types), selectinload(Bit.status))
        .order_by(Bit.created_at.desc())
    )
    return [svc.to_out(b) for b in db.scalars(query)]


@router.get("/{bit_id}", response_model=BitOut)
def get_bit(bit_id: uuid.UUID, user: CurrentUser, db: DbSession) -> BitOut:
    return svc.to_out(get_owned(db, Bit, bit_id, user))


@router.put("/{bit_id}", response_model=BitOut)
def put_bit(bit_id: uuid.UUID, body: BitIn, user: CurrentUser, db: DbSession) -> BitOut:
    """Create or update. The client picks the id, so a retried offline save never duplicates."""
    existing = find_owned(db, Bit, bit_id, user)
    return svc.to_out(svc.save(db, user, bit_id, body, existing))


@router.delete("/{bit_id}", status_code=204)
def delete_bit(bit_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    """Deleting a bit also removes its brainstorms and setlist entries (database cascade)."""
    bit = find_owned(db, Bit, bit_id, user)
    if bit is None:
        return  # already gone: a replayed offline delete is fine
    db.delete(bit)
    db.flush()
    svc.prune_unused_types(db, user)
    db.commit()
