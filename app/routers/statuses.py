"""Joke statuses: list, add, rename (or merge), delete (jokes go to Draft) and arrange."""

import uuid

from fastapi import APIRouter

from app.auth.deps import CurrentUser, DbSession, get_owned
from app.models import Status
from app.schemas.library import NamedOut, OrderIn, ShortNameIn
from app.services import statuses as svc
from app.services.jokes import get_or_create_status

router = APIRouter(prefix="/api/statuses", tags=["library"])


@router.get("", response_model=list[NamedOut])
def list_statuses(user: CurrentUser, db: DbSession) -> list[Status]:
    """Draft first, then the order you set."""
    rows = svc.ordered(db, user)
    db.commit()  # keeps a Draft made for an account that had none
    return rows


@router.post("", response_model=NamedOut, status_code=201)
def create_status(body: ShortNameIn, user: CurrentUser, db: DbSession) -> Status:
    status = get_or_create_status(db, user, body.name)
    db.commit()
    return status


@router.put("/order", status_code=204)
def reorder_statuses(body: OrderIn, user: CurrentUser, db: DbSession) -> None:
    svc.reorder(db, user, body.ids)


@router.patch("/{status_id}", status_code=204)
def rename_status(
    status_id: uuid.UUID, body: ShortNameIn, user: CurrentUser, db: DbSession
) -> None:
    svc.rename(db, user, get_owned(db, Status, status_id, user), body.name)


@router.delete("/{status_id}", status_code=204)
def delete_status(status_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    svc.delete(db, user, get_owned(db, Status, status_id, user))
