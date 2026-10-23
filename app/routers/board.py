"""The joke board: where you've moved jokes by hand."""

import uuid

from fastapi import APIRouter
from sqlalchemy import delete, select

from app.auth.deps import CurrentUser, DbSession, get_owned
from app.models import BoardSpot, Joke
from app.schemas.board import BoardSpotIn, BoardSpotOut, TidyIn

router = APIRouter(prefix="/api/board", tags=["board"])


@router.get("", response_model=list[BoardSpotOut])
def list_spots(user: CurrentUser, db: DbSession) -> list[BoardSpot]:
    return list(db.scalars(select(BoardSpot).where(BoardSpot.user_id == user.id)))


@router.put("/{joke_id}", response_model=BoardSpotOut)
def place_joke(
    joke_id: uuid.UUID, body: BoardSpotIn, user: CurrentUser, db: DbSession
) -> BoardSpot:
    """Put a joke where you dropped it on the board."""
    get_owned(db, Joke, joke_id, user)
    spot = db.scalar(select(BoardSpot).where(BoardSpot.joke_id == joke_id))
    if spot is None:
        spot = BoardSpot(user_id=user.id, joke_id=joke_id)
        db.add(spot)
    spot.topic_id, spot.x, spot.y = body.topic_id, body.x, body.y
    db.commit()
    db.refresh(spot)
    return spot


@router.post("/tidy", status_code=204)
def tidy(body: TidyIn, user: CurrentUser, db: DbSession) -> None:
    """Forget where these jokes were put, so the board lays them out again."""
    query = delete(BoardSpot).where(BoardSpot.user_id == user.id)
    if body.joke_ids:
        query = query.where(BoardSpot.joke_id.in_(body.joke_ids))
    db.execute(query)
    db.commit()
