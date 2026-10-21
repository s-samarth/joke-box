"""Craft areas: the folders craft notes live in. Yours to add, rename, colour, order and delete."""

import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.auth.deps import CurrentUser, DbSession, get_owned
from app.models import CraftArea
from app.schemas.craft import AreaOrderIn, CraftAreaIn, CraftAreaOut
from app.services import craft_areas as svc
from app.services.topics import commit_or_conflict

router = APIRouter(prefix="/api/craft-areas", tags=["craft"])

CLASH = "An area with that name already exists"


@router.get("", response_model=list[CraftAreaOut])
def list_areas(user: CurrentUser, db: DbSession) -> list[CraftArea]:
    """Your areas in order. Someone signed in before areas existed gets the starting set here."""
    svc.ensure_craft_areas(db, user)
    db.commit()
    query = select(CraftArea).where(CraftArea.user_id == user.id)
    return list(db.scalars(query.order_by(CraftArea.position, CraftArea.created_at)))


@router.post("", response_model=CraftAreaOut, status_code=201)
def create_area(body: CraftAreaIn, user: CurrentUser, db: DbSession) -> CraftArea:
    """A new area goes last."""
    count = len(list(db.scalars(select(CraftArea.id).where(CraftArea.user_id == user.id))))
    area = CraftArea(user_id=user.id, position=count, **body.model_dump())
    db.add(area)
    commit_or_conflict(db, CLASH)
    return area


@router.patch("/{area_id}", response_model=CraftAreaOut)
def update_area(
    area_id: uuid.UUID, body: CraftAreaIn, user: CurrentUser, db: DbSession
) -> CraftArea:
    area = get_owned(db, CraftArea, area_id, user)
    for field, value in body.model_dump().items():
        setattr(area, field, value)
    commit_or_conflict(db, CLASH)
    return area


@router.put("/order", status_code=204)
def reorder_areas(body: AreaOrderIn, user: CurrentUser, db: DbSession) -> None:
    svc.reorder_areas(db, user, body.ids)


@router.delete("/{area_id}", status_code=204)
def delete_area(
    area_id: uuid.UUID, user: CurrentUser, db: DbSession, move_to: uuid.UUID | None = None
) -> None:
    """Its notes move to `move_to`, or to your first other area."""
    svc.delete_area(db, user, get_owned(db, CraftArea, area_id, user), move_to)
