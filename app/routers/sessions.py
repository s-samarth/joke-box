"""Free brainstorm sessions: write or draw against a timer, link jokes and observations."""

import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.auth.deps import CurrentUser, DbSession, find_owned, get_owned
from app.models import CraftNote, WritingSession
from app.schemas.notebook import WritingSessionIn, WritingSessionOut

router = APIRouter(prefix="/api", tags=["sessions"])


@router.get("/sessions", response_model=list[WritingSessionOut])
def list_sessions(user: CurrentUser, db: DbSession) -> list[WritingSession]:
    query = (
        select(WritingSession)
        .where(WritingSession.user_id == user.id)
        .order_by(WritingSession.updated_at.desc())
    )
    return list(db.scalars(query))


@router.put("/sessions/{session_id}", response_model=WritingSessionOut)
def put_session(
    session_id: uuid.UUID, body: WritingSessionIn, user: CurrentUser, db: DbSession
) -> WritingSession:
    """Create or update. The client picks the id, so autosaves and offline retries are safe."""
    if body.technique_id is not None:
        get_owned(db, CraftNote, body.technique_id, user)  # only your own techniques
    session = find_owned(db, WritingSession, session_id, user)
    if session is None:
        session = WritingSession(id=session_id, user_id=user.id)
        db.add(session)
    data = body.model_dump(mode="json")
    session.title = data["title"]
    session.content = data["content"]
    session.ink = data["ink"]
    session.ink_pages = data["ink_pages"]
    session.timer_seconds = data["timer_seconds"]
    session.bit_ids = data["bit_ids"]
    session.observation_ids = data["observation_ids"]
    session.technique_id = body.technique_id
    db.commit()
    db.refresh(session)
    return session


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    session = find_owned(db, WritingSession, session_id, user)
    if session is None:
        return  # already gone: a replayed offline delete is fine
    db.delete(session)
    db.commit()
