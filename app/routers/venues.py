"""Venues: list them with how often they're used, add one, delete one (moving its shows first)."""

import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select, update

from app.auth.deps import CurrentUser, DbSession, get_owned
from app.models import PerformanceLog, Setlist, Venue
from app.routers.shows import venue_named
from app.schemas.library import NameIn
from app.schemas.shows import VenueOut

router = APIRouter(prefix="/api/venues", tags=["venues"])


def usage(db: DbSession, model: type[PerformanceLog] | type[Setlist], venue_id: uuid.UUID) -> int:
    """How many shows (or sets) point at this venue."""
    return db.scalar(select(func.count()).where(model.venue_id == venue_id)) or 0


def venue_out(db: DbSession, venue: Venue) -> VenueOut:
    return VenueOut(
        id=venue.id,
        name=venue.name,
        shows=usage(db, PerformanceLog, venue.id),
        sets=usage(db, Setlist, venue.id),
    )


@router.get("", response_model=list[VenueOut])
def list_venues(user: CurrentUser, db: DbSession) -> list[VenueOut]:
    venues = db.scalars(select(Venue).where(Venue.user_id == user.id).order_by(Venue.name))
    return [venue_out(db, v) for v in venues]


@router.post("", response_model=VenueOut, status_code=201)
def create_venue(body: NameIn, user: CurrentUser, db: DbSession) -> VenueOut:
    venue = venue_named(db, user, body.name)
    db.commit()
    return venue_out(db, venue)


@router.delete("/{venue_id}", status_code=204)
def delete_venue(
    venue_id: uuid.UUID, user: CurrentUser, db: DbSession, move_to: uuid.UUID | None = None
) -> None:
    """Delete a venue. If shows or sets use it, they must move to another of your venues first,
    so no show ever loses where it happened."""
    venue = get_owned(db, Venue, venue_id, user)
    shows, sets = usage(db, PerformanceLog, venue.id), usage(db, Setlist, venue.id)
    if move_to is None:
        if shows or sets:
            detail = f"{venue.name} has {shows} shows and {sets} sets. Move them first."
            raise HTTPException(409, detail)
    else:
        target = get_owned(db, Venue, move_to, user)
        if target.id == venue.id:
            raise HTTPException(422, "Pick a different venue to move them to")
        for model in (PerformanceLog, Setlist):
            db.execute(update(model).where(model.venue_id == venue.id).values(venue_id=target.id))
    db.delete(venue)
    db.commit()
