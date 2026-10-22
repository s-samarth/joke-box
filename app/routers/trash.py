"""The Trash: see what you deleted, put it back, or erase it for good."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.auth.deps import CurrentUser, DbSession
from app.models import (
    Analysis,
    Brainstorm,
    CraftNote,
    Joke,
    Observation,
    PerformanceLog,
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


def describe(db: DbSession, user: User, row: Trashable) -> tuple[str, str] | None:
    """A row's title and detail line, or None if it shouldn't be listed on its own."""
    match row:
        case Joke():
            rewrites = len(svc.rewrites_of(db, row, row.deleted_at))
            detail = f"With {rewrites} rewrite{'s' * (rewrites != 1)}" if rewrites else ""
            return first_line(row.setup, "Untitled joke"), detail
        case Brainstorm():
            joke = svc.find_any(db, Joke, row.joke_id, user)
            if joke is None or joke.deleted_at is not None:
                return None  # it's in the Trash with its joke, and comes back with it
            setup = first_line(joke.setup, "")
            return first_line(row.title or row.content, "Untitled rewrite"), setup
        case Observation():
            return first_line(row.text, "Empty observation"), ""
        case WritingSession():
            return first_line(row.title or row.content, "Untitled brainstorm"), ""
        case VoiceNote():
            return row.label or "Voice note", " ".join(f"#{t}" for t in row.hashtags)
        case PerformanceLog():
            return row.venue.name if row.venue else "Unidentified Venue", ""
        case Analysis():
            return row.title, ""
        case WatchItem():
            return row.title, row.comedian
        case CraftNote():
            return row.title, ""
    return None


@router.get("", response_model=list[TrashItemOut])
def list_trash(user: CurrentUser, db: DbSession, store: Store) -> list[TrashItemOut]:
    """Everything in the Trash, by kind. Anything kept 30 days is erased first."""
    svc.purge_expired(db, user, store)
    items = []
    for kind, model in svc.KINDS.items():
        for row in svc.trashed(db, model, user):
            described = describe(db, user, row)
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
