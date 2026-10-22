"""Voice notes: save a note's details, upload its audio, play it back, delete it.

The client saves the details first (PUT /voice-notes/{id}), then uploads the audio as the raw
request body (PUT /voice-notes/{id}/audio). Both are keyed by an id the browser makes, so a
recording made offline can be retried later without creating duplicates.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from sqlalchemy import select

from app.auth.deps import CurrentUser, DbSession, find_owned, get_owned
from app.models import VoiceNote
from app.models.base import written_at
from app.schemas.voice import VoiceNoteIn, VoiceNoteOut
from app.services.audio_store import AudioStore, get_audio_store
from app.services.trash import move_to_trash

router = APIRouter(prefix="/api/voice-notes", tags=["voice"])

# Vercel refuses request bodies over 4.5 MB, so a note stops a little below that.
MAX_AUDIO_BYTES = 4 * 1024 * 1024
EXTENSIONS = {"audio/mp4": "m4a", "audio/webm": "webm", "audio/ogg": "ogg", "audio/mpeg": "mp3"}

Store = Annotated[AudioStore, Depends(get_audio_store)]


async def audio_body(request: Request) -> bytes:
    """Read the upload in the event loop, so the route itself can stay synchronous."""
    declared = int(request.headers.get("content-length") or 0)
    if declared > MAX_AUDIO_BYTES:
        raise HTTPException(413, "That recording is too long to upload")
    return await request.body()


@router.get("", response_model=list[VoiceNoteOut])
def list_notes(user: CurrentUser, db: DbSession) -> list[VoiceNote]:
    query = select(VoiceNote).where(VoiceNote.user_id == user.id)
    return list(db.scalars(query.order_by(VoiceNote.created_at.desc())))


@router.put("/{note_id}", response_model=VoiceNoteOut)
def put_note(note_id: uuid.UUID, body: VoiceNoteIn, user: CurrentUser, db: DbSession) -> VoiceNote:
    """Create a note or change its label, hashtags or length."""
    note = find_owned(db, VoiceNote, note_id, user)
    if note is None:
        note = VoiceNote(id=note_id, user_id=user.id)
        if body.created_at:
            note.created_at = written_at(body.created_at)
        db.add(note)
    note.label = body.label.strip()
    note.hashtags = [t.strip() for t in body.hashtags if t.strip()]
    note.duration_seconds = body.duration_seconds
    db.commit()
    db.refresh(note)
    return note


@router.put("/{note_id}/audio", response_model=VoiceNoteOut)
def put_audio(
    note_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    store: Store,
    data: Annotated[bytes, Depends(audio_body)],
    content_type: Annotated[str, Header()] = "",
) -> VoiceNote:
    # A recording still uploading from one phone lands even if the note was deleted on another,
    # so putting it back from the Trash brings back its sound.
    note = get_owned(db, VoiceNote, note_id, user, in_trash=True)
    kind = content_type.split(";")[0].strip().lower()
    if not kind.startswith("audio/"):
        raise HTTPException(415, "Only audio can be uploaded")
    if not data:
        raise HTTPException(400, "The recording is empty")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "That recording is too long to upload")
    path = f"voice/{user.id}/{note.id}.{EXTENSIONS.get(kind, 'audio')}"
    store.put(path, data, content_type[:100])
    note.audio_path, note.content_type, note.size_bytes = path, content_type[:100], len(data)
    db.commit()
    db.refresh(note)
    return note


@router.get("/{note_id}/audio")
def get_audio(note_id: uuid.UUID, user: CurrentUser, db: DbSession, store: Store) -> Response:
    note = get_owned(db, VoiceNote, note_id, user)
    if not note.audio_path:
        raise HTTPException(404, "This note's audio hasn't uploaded yet")
    # A note's audio never changes, so the browser may keep it; "private" keeps it off CDNs.
    headers = {"Cache-Control": "private, max-age=31536000", "X-Content-Type-Options": "nosniff"}
    return Response(store.get(note.audio_path), media_type=note.content_type, headers=headers)


@router.delete("/{note_id}", status_code=204)
def delete_note(note_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    """To the Trash. The recording is kept until the Trash erases it."""
    move_to_trash(db, user, VoiceNote, note_id)
