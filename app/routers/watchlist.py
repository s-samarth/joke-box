"""The watchlist: routines to study, ticked off when watched.

Saves are upserts keyed by an id the browser makes, like jokes, so ticks made offline replay
safely.
"""

import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.auth.deps import CurrentUser, DbSession, find_owned
from app.models import WatchItem
from app.schemas.study import WatchItemIn, WatchItemOut
from app.services.trash import move_to_trash

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


def _ordered(user: CurrentUser, db: DbSession) -> list[WatchItem]:
    query = select(WatchItem).where(WatchItem.user_id == user.id)
    return list(db.scalars(query.order_by(WatchItem.position, WatchItem.created_at)))


@router.get("", response_model=list[WatchItemOut])
def list_items(user: CurrentUser, db: DbSession) -> list[WatchItem]:
    return _ordered(user, db)


@router.put("/{item_id}", response_model=WatchItemOut)
def put_item(item_id: uuid.UUID, body: WatchItemIn, user: CurrentUser, db: DbSession) -> WatchItem:
    """Create or update a routine: its details or whether it's watched."""
    item = find_owned(db, WatchItem, item_id, user)
    if item is None:
        item = WatchItem(id=item_id, user_id=user.id)
        db.add(item)
    for field, value in body.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    move_to_trash(db, user, WatchItem, item_id)
