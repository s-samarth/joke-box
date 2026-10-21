"""Craft notes: checklists, techniques, reference and goals about doing stand-up."""

import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.auth.deps import CurrentUser, DbSession, find_owned, get_owned
from app.models import Analysis, CraftNote, PerformanceLog
from app.schemas.craft import CraftNoteIn, CraftNoteOut

router = APIRouter(prefix="/api/craft-notes", tags=["craft"])


@router.get("", response_model=list[CraftNoteOut])
def list_craft_notes(user: CurrentUser, db: DbSession) -> list[CraftNote]:
    query = select(CraftNote).where(CraftNote.user_id == user.id)
    return list(db.scalars(query.order_by(CraftNote.position, CraftNote.created_at)))


@router.put("/{note_id}", response_model=CraftNoteOut)
def put_craft_note(
    note_id: uuid.UUID, body: CraftNoteIn, user: CurrentUser, db: DbSession
) -> CraftNote:
    """Create or update. The client picks the id, so a save made offline replays safely."""
    if body.performance_log_id is not None:
        get_owned(db, PerformanceLog, body.performance_log_id, user)  # only your own shows
    if body.analysis_id is not None:
        get_owned(db, Analysis, body.analysis_id, user)
    note = find_owned(db, CraftNote, note_id, user)
    if note is None:
        note = CraftNote(id=note_id, user_id=user.id)
        if body.created_at:
            note.created_at = body.created_at
        db.add(note)
    for field, value in body.model_dump(exclude={"created_at"}).items():
        setattr(note, field, value)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=204)
def delete_craft_note(note_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    note = find_owned(db, CraftNote, note_id, user)
    if note is None:
        return  # already gone: a replayed offline delete is fine
    db.delete(note)
    db.commit()
