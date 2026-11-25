"""Setlists and performance logs (venues have their own router; saving a show is in
services/show_logs.py, shared with the connector)."""

import uuid

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.auth.deps import CurrentUser, DbSession
from app.models import Joke, PerformanceLog, Setlist, Topic, User
from app.schemas.reviews import ReviewOut
from app.schemas.shows import LogIn, LogOut, SetlistIn, SetlistOut
from app.services.setlists import save_set, setlist_out, your_jokes
from app.services.show_jokes import jokes_out
from app.services.show_logs import save_show
from app.services.trash import move_to_trash, trashed_joke_ids

router = APIRouter(prefix="/api", tags=["shows"])


def check_all_owned(
    db: Session, model: type[Joke] | type[Topic], ids: set[uuid.UUID], user: User
) -> None:
    found = db.scalar(select(func.count()).where(model.id.in_(ids), model.user_id == user.id))
    if found != len(ids):
        raise HTTPException(422, f"Unknown {model.__name__.lower()} in request")


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
    jokes = your_jokes(db, user)
    return [setlist_out(s, jokes) for s in db.scalars(query)]


@router.put("/setlists/{setlist_id}", response_model=SetlistOut)
def save_setlist(
    setlist_id: uuid.UUID, body: SetlistIn, user: CurrentUser, db: DbSession
) -> SetlistOut:
    """Create or replace a set, its beats and its items in one transaction."""
    return save_set(db, user, setlist_id, body)


@router.delete("/setlists/{setlist_id}", status_code=204)
def delete_setlist(setlist_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    """To the Trash, with its jokes in order: putting it back returns the set as it was."""
    move_to_trash(db, user, Setlist, setlist_id)


def log_out(log: PerformanceLog, hidden: set[uuid.UUID]) -> LogOut:
    return LogOut(
        id=log.id,
        version=log.version,
        venue_name=log.venue.name if log.venue else "Unidentified Venue",
        performed_at=log.performed_at,
        duration_seconds=log.duration_seconds,
        audience_size=log.audience_size,
        rating=log.rating,
        topic_ids=[t.id for t in log.topics],
        notes=log.notes,
        learned=log.learned,
        laughs=log.laughs,
        jokes=jokes_out(log, hidden),
        review=ReviewOut.model_validate(log.review, from_attributes=True) if log.review else None,
        created_at=log.created_at,
    )


@router.get("/logs", response_model=list[LogOut])
def list_logs(user: CurrentUser, db: DbSession) -> list[LogOut]:
    """All logs. Filters, sorting, paging and stats run in the browser."""
    query = (
        select(PerformanceLog)
        .where(PerformanceLog.user_id == user.id)
        .options(*(selectinload(r) for r in (PerformanceLog.venue, PerformanceLog.topics)))
        .options(selectinload(PerformanceLog.jokes), selectinload(PerformanceLog.review))
        .order_by(PerformanceLog.performed_at.desc())
    )
    hidden = trashed_joke_ids(db, user)
    return [log_out(log, hidden) for log in db.scalars(query)]


@router.put("/logs/{log_id}", response_model=LogOut)
def save_log(log_id: uuid.UUID, body: LogIn, user: CurrentUser, db: DbSession) -> LogOut:
    check_all_owned(db, Topic, set(body.topic_ids), user)
    log = save_show(db, user, log_id, body)
    return log_out(log, trashed_joke_ids(db, user))


@router.delete("/logs/{log_id}", status_code=204)
def delete_log(log_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    move_to_trash(db, user, PerformanceLog, log_id)
