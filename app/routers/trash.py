"""The Trash: see what you deleted, put it back, or erase it for good."""

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.auth.deps import CurrentUser, DbSession
from app.models import (
    Analysis,
    Brainstorm,
    CraftNote,
    Joke,
    Observation,
    PerformanceLog,
    Premise,
    Setlist,
    User,
    VoiceNote,
    WatchItem,
    WritingSession,
)
from app.models.trash import Trashable
from app.schemas.trash import TrashItemOut
from app.services import trash as svc
from app.services.audio_store import AudioStore, get_audio_store

router = APIRouter(prefix="/api/trash", tags=["trash"])

Store = Annotated[AudioStore, Depends(get_audio_store)]


def first_line(text: str, fallback: str) -> str:
    line = next((ln.strip() for ln in text.splitlines() if ln.strip()), "")
    return line[:200] or fallback


class Lookups:
    """What describing the Trash needs beyond the rows themselves, fetched once for all of them
    rather than once per row."""

    def __init__(self, db: DbSession, user: User, rows: dict[str, list[Trashable]]) -> None:
        jokes = {j.id: j for j in rows["jokes"] if isinstance(j, Joke)}
        self.rewrites: dict[tuple[uuid.UUID, object], int] = {}
        live_ids = set()
        for r in rows["rewrites"]:
            if isinstance(r, Brainstorm):
                key = (r.joke_id, r.deleted_at)
                self.rewrites[key] = self.rewrites.get(key, 0) + 1
                if r.joke_id not in jokes:
                    live_ids.add(r.joke_id)
        query = select(Joke.id, Joke.setup).where(Joke.user_id == user.id, Joke.id.in_(live_ids))
        self.live_setups = {i: setup for i, setup in db.execute(query)} if live_ids else {}


def describe(row: Trashable, found: Lookups) -> tuple[str, str] | None:
    """A row's title and detail line, or None if it shouldn't be listed on its own."""
    match row:
        case Joke():
            rewrites = found.rewrites.get((row.id, row.deleted_at), 0)
            detail = f"With {rewrites} rewrite{'s' * (rewrites != 1)}" if rewrites else ""
            return first_line(row.setup, "Untitled joke"), detail
        case Brainstorm():
            if row.joke_id not in found.live_setups:
                return None  # it's in the Trash with its joke, and comes back with it
            setup = first_line(found.live_setups[row.joke_id], "")
            return first_line(row.title or row.content, "Untitled rewrite"), setup
        case Premise():
            on_it = len(row.trashed_joke_ids or [])
            detail = f"{on_it} joke{'s' * (on_it != 1)} go back on it" if on_it else ""
            return first_line(row.take, "Untitled premise"), detail
        case Observation():
            return first_line(row.text, "Empty observation"), ""
        case WritingSession():
            return first_line(row.title or row.content, "Untitled brainstorm"), ""
        case VoiceNote():
            return row.label or "Voice note", " ".join(f"#{t}" for t in row.hashtags)
        case Setlist():
            count = len(row.items)
            return row.name, f"{count} joke{'s' * (count != 1)}"
        case PerformanceLog():
            return row.venue.name if row.venue else "Unidentified Venue", ""
        case Analysis():
            return row.title, ""
        case WatchItem():
            return row.title, row.comedian
        case CraftNote():
            return row.title, ""
    return None


# Loaded with their rows, so describing them doesn't fetch one at a time.
WITH: dict[type[Trashable], Any] = {
    Setlist: selectinload(Setlist.items),
    PerformanceLog: selectinload(PerformanceLog.venue),
}


@router.get("", response_model=list[TrashItemOut])
def list_trash(user: CurrentUser, db: DbSession, store: Store) -> list[TrashItemOut]:
    """Everything in the Trash, by kind. Anything kept 30 days is erased first."""
    svc.purge_expired(db, user, store)
    rows: dict[str, list[Trashable]] = {}
    for kind, model in svc.KINDS.items():
        query = svc.in_trash(model, user)
        if model in WITH:
            query = query.options(WITH[model])
        rows[kind] = list(db.scalars(query))
    found = Lookups(db, user, rows)
    items = []
    for kind, kept in rows.items():
        for row in kept:
            described = describe(row, found)
            if described is None or row.deleted_at is None:
                continue
            title, detail = described
            when = row.performed_at if isinstance(row, PerformanceLog) else None
            items.append(
                TrashItemOut(
                    kind=kind,
                    id=row.id,  # type: ignore[attr-defined]
                    title=title,
                    detail=detail,
                    when=when,
                    deleted_at=row.deleted_at,
                    erase_at=row.deleted_at + svc.KEEP_FOR,
                )
            )
    return items


def model_for(kind: str) -> type[Trashable]:
    if kind not in svc.KINDS:
        raise HTTPException(404, "Unknown kind of thing")
    return svc.KINDS[kind]


@router.post("/{kind}/{row_id}/restore", status_code=204)
def restore(kind: str, row_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    svc.restore(db, user, model_for(kind), row_id)


@router.delete("/{kind}/{row_id}", status_code=204)
def delete_forever(
    kind: str, row_id: uuid.UUID, user: CurrentUser, db: DbSession, store: Store
) -> None:
    svc.delete_forever(db, user, model_for(kind), row_id, store)


@router.delete("", status_code=204)
def empty_trash(user: CurrentUser, db: DbSession, store: Store) -> None:
    svc.empty(db, user, store)
