"""Setlists and performance logs (venues have their own router; `venue_named` lives here)."""

import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import CurrentUser, DbSession, find_owned, get_owned
from app.models import Bit, PerformanceLog, Setlist, SetlistItem, SetTag, Topic, User, Venue
from app.schemas.shows import (
    LogIn,
    LogOut,
    SetlistIn,
    SetlistItemIn,
    SetlistItemOut,
    SetlistOut,
)
from app.services.trash import move_to_trash, trashed_bit_ids

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


def check_all_owned(
    db: Session, model: type[Bit] | type[Topic], ids: set[uuid.UUID], user: User
) -> None:
    found = db.scalar(select(func.count()).where(model.id.in_(ids), model.user_id == user.id))
    if found != len(ids):
        raise HTTPException(422, f"Unknown {model.__name__.lower()} in request")


def setlist_out(s: Setlist, hidden: set[uuid.UUID]) -> SetlistOut:
    """A set as the app sees it: jokes in the Trash are left out until they come back."""
    return SetlistOut(
        id=s.id,
        name=s.name,
        show_date=s.show_date,
        target_seconds=s.target_seconds,
        venue_name=s.venue.name if s.venue else None,
        rating=s.rating,
        tag_ids=[t.id for t in s.tags],
        items=[SetlistItemOut.model_validate(i) for i in s.items if i.bit_id not in hidden],
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


@router.get("/setlists", response_model=list[SetlistOut])
def list_setlists(user: CurrentUser, db: DbSession) -> list[SetlistOut]:
    query = (
        select(Setlist)
        .where(Setlist.user_id == user.id)
        .options(
            selectinload(Setlist.items), selectinload(Setlist.venue), selectinload(Setlist.tags)
        )
        .order_by(Setlist.updated_at.desc())
    )
    hidden = trashed_bit_ids(db, user)
    return [setlist_out(s, hidden) for s in db.scalars(query)]


@router.put("/setlists/{setlist_id}", response_model=SetlistOut)
def save_setlist(
    setlist_id: uuid.UUID, body: SetlistIn, user: CurrentUser, db: DbSession
) -> SetlistOut:
    """Create or replace a setlist and its items in one transaction."""
    hidden = trashed_bit_ids(db, user)
    # A set saved offline may still list a joke deleted since on another device: it keeps its
    # place, hidden like any joke in the Trash.
    sent = [i for i in body.items if i.bit_id not in hidden]
    check_all_owned(db, Bit, {i.bit_id for i in sent}, user)
    venue = venue_named(db, user, body.venue_name) if body.venue_name else None
    setlist = find_owned(db, Setlist, setlist_id, user) or Setlist(id=setlist_id, user_id=user.id)
    setlist.name = body.name
    setlist.show_date = body.show_date
    setlist.target_seconds = body.target_seconds
    setlist.venue = venue
    setlist.rating = body.rating
    # Only your tags that still exist: one deleted while a save waited (offline, or with the set
    # open) just drops off, rather than failing the save.
    mine = select(SetTag).where(SetTag.id.in_(body.tag_ids), SetTag.user_id == user.id)
    setlist.tags = list(db.scalars(mine))
    db.add(setlist)
    items = [SetlistItemIn.model_validate(i, from_attributes=True) for i in sent]
    # Jokes in the Trash aren't sent by the app, so keep their places for when they come back.
    for away in sorted(setlist.items, key=lambda i: i.position):
        if away.bit_id in hidden:
            kept = SetlistItemIn.model_validate(away, from_attributes=True)
            items.insert(min(away.position, len(items)), kept)
    setlist.items = [SetlistItem(position=n, **item.model_dump()) for n, item in enumerate(items)]
    db.commit()
    db.refresh(setlist)
    return setlist_out(setlist, hidden)


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
        laughs=log.laughs,
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
    log.laughs = body.laughs
    log.topics = topics
    db.add(log)
    db.commit()
    db.refresh(log)
    return log_out(log)


@router.delete("/logs/{log_id}", status_code=204)
def delete_log(log_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    move_to_trash(db, user, PerformanceLog, log_id)
