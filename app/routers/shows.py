"""Venues, setlists and performance logs."""

import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import CurrentUser, DbSession, find_owned, get_owned
from app.models import Bit, PerformanceLog, Setlist, SetlistItem, Topic, User, Venue
from app.schemas.library import NameIn
from app.schemas.shows import LogIn, LogOut, SetlistIn, SetlistItemOut, SetlistOut, VenueOut

router = APIRouter(prefix="/api", tags=["shows"])


def venue_named(db: Session, user: User, name: str) -> Venue:
    """Find a venue case-insensitively, creating it inline if new."""
    name = name.strip()
    venue = db.scalar(
        select(Venue).where(Venue.user_id == user.id, func.lower(Venue.name) == name.lower())
    )
    if venue is None:
        venue = Venue(user_id=user.id, name=name)
        db.add(venue)
        db.flush()
    return venue


def check_all_owned(db: Session, model: type[Bit] | type[Topic], ids: set[uuid.UUID], user: User):  # type: ignore[no-untyped-def]
    found = db.scalar(select(func.count()).where(model.id.in_(ids), model.user_id == user.id))
    if found != len(ids):
        raise HTTPException(422, f"Unknown {model.__name__.lower()} in request")


@router.get("/venues", response_model=list[VenueOut])
def list_venues(user: CurrentUser, db: DbSession) -> list[Venue]:
    return list(db.scalars(select(Venue).where(Venue.user_id == user.id).order_by(Venue.name)))


@router.post("/venues", response_model=VenueOut, status_code=201)
def create_venue(body: NameIn, user: CurrentUser, db: DbSession) -> Venue:
    venue = venue_named(db, user, body.name)
    db.commit()
    return venue


def setlist_out(s: Setlist) -> SetlistOut:
    return SetlistOut(
        id=s.id,
        name=s.name,
        show_date=s.show_date,
        target_seconds=s.target_seconds,
        venue_name=s.venue.name if s.venue else None,
        items=[SetlistItemOut.model_validate(i) for i in s.items],
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


@router.get("/setlists", response_model=list[SetlistOut])
def list_setlists(user: CurrentUser, db: DbSession) -> list[SetlistOut]:
    query = (
        select(Setlist)
        .where(Setlist.user_id == user.id)
        .options(selectinload(Setlist.items), selectinload(Setlist.venue))
        .order_by(Setlist.updated_at.desc())
    )
    return [setlist_out(s) for s in db.scalars(query)]


@router.put("/setlists/{setlist_id}", response_model=SetlistOut)
def save_setlist(
    setlist_id: uuid.UUID, body: SetlistIn, user: CurrentUser, db: DbSession
) -> SetlistOut:
    """Create or replace a setlist and its items in one transaction."""
    check_all_owned(db, Bit, {i.bit_id for i in body.items}, user)
    venue = venue_named(db, user, body.venue_name) if body.venue_name else None
    setlist = find_owned(db, Setlist, setlist_id, user) or Setlist(id=setlist_id, user_id=user.id)
    setlist.name = body.name
    setlist.show_date = body.show_date
    setlist.target_seconds = body.target_seconds
    setlist.venue = venue
    db.add(setlist)
    setlist.items = [
        SetlistItem(bit_id=i.bit_id, position=n, duration_seconds=i.duration_seconds)
        for n, i in enumerate(body.items)
    ]
    db.commit()
    db.refresh(setlist)
    return setlist_out(setlist)


@router.delete("/setlists/{setlist_id}", status_code=204)
def delete_setlist(setlist_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    db.delete(get_owned(db, Setlist, setlist_id, user))
    db.commit()


def log_out(log: PerformanceLog) -> LogOut:
    return LogOut(
        id=log.id,
        venue_name=log.venue.name if log.venue else "Unidentified Venue",
        performed_at=log.performed_at,
        duration_seconds=log.duration_seconds,
        audience_size=log.audience_size,
        rating=log.rating,
        topic_ids=[t.id for t in log.topics],
        notes=log.notes,
        created_at=log.created_at,
    )


@router.get("/logs", response_model=list[LogOut])
def list_logs(user: CurrentUser, db: DbSession) -> list[LogOut]:
    """All logs. Filters, sorting, paging and stats run in the browser."""
    query = (
        select(PerformanceLog)
        .where(PerformanceLog.user_id == user.id)
        .options(selectinload(PerformanceLog.venue), selectinload(PerformanceLog.topics))
        .order_by(PerformanceLog.performed_at.desc())
    )
    return [log_out(log) for log in db.scalars(query)]


@router.put("/logs/{log_id}", response_model=LogOut)
def save_log(log_id: uuid.UUID, body: LogIn, user: CurrentUser, db: DbSession) -> LogOut:
    topic_ids = set(body.topic_ids)
    check_all_owned(db, Topic, topic_ids, user)
    venue = venue_named(db, user, body.venue_name)
    topics = list(db.scalars(select(Topic).where(Topic.id.in_(topic_ids)))) if topic_ids else []
    log = find_owned(db, PerformanceLog, log_id, user) or PerformanceLog(id=log_id, user_id=user.id)
    log.venue = venue
    log.performed_at = body.performed_at
    log.duration_seconds = body.duration_seconds
    log.audience_size = body.audience_size
    log.rating = body.rating
    log.notes = body.notes
    log.topics = topics
    db.add(log)
    db.commit()
    db.refresh(log)
    return log_out(log)


@router.delete("/logs/{log_id}", status_code=204)
def delete_log(log_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    db.delete(get_owned(db, PerformanceLog, log_id, user))
    db.commit()
