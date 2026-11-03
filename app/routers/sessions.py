"""Free brainstorm sessions: write or draw against a timer, link jokes and observations."""

import uuid

from fastapi import APIRouter, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import undefer

from app.auth.deps import CurrentUser, DbSession, find_owned, get_owned
from app.models import CraftNote, WritingSession
from app.packed import packed_json
from app.schemas.notebook import WritingSessionIn, WritingSessionOut, WritingSessionSummary
from app.services.trash import move_to_trash

router = APIRouter(prefix="/api", tags=["sessions"])


def newest_first(user: CurrentUser, db: DbSession, with_ink: bool = False) -> list[WritingSession]:
    """The user's sessions. The ink stays in the database unless it's asked for: it's most of
    what a session weighs, and the list only needs the stroke count."""
    query = (
        select(WritingSession)
        .where(WritingSession.user_id == user.id)
        .order_by(WritingSession.updated_at.desc())
    )
    if with_ink:
        query = query.options(undefer(WritingSession.ink))
    return list(db.scalars(query))


@router.get("/sessions", response_model=list[WritingSessionOut])
def list_sessions(user: CurrentUser, db: DbSession) -> list[WritingSession]:
    """Every session with all its ink. Kept for app versions from before the summaries below:
    the current app never calls it, since all the ink at once outgrows the host's 4.5 MB limit."""
    return newest_first(user, db, with_ink=True)


@router.get("/sessions/summaries", response_model=list[WritingSessionSummary])
def list_summaries(user: CurrentUser, db: DbSession) -> list[WritingSession]:
    """Every session without its ink, newest first."""
    return newest_first(user, db)


@router.get("/sessions/{session_id}", response_class=Response)
def get_session(session_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Response:
    """One session with its ink, gzip-packed so even a session of dense pages fits the limit."""
    query = select(WritingSession).where(
        WritingSession.id == session_id, WritingSession.user_id == user.id
    )
    session = db.scalar(query.options(undefer(WritingSession.ink)))
    if session is None:
        raise HTTPException(404, "WritingSession not found")
    return packed_json(WritingSessionOut.model_validate(session).model_dump_json().encode())


# The answer to a save leaves out the ink: echoing a big session back could outgrow the limit
# and fail a save that had in fact gone through. The save doesn't read the old ink either.
@router.put("/sessions/{session_id}", response_model=WritingSessionSummary)
def put_session(
    session_id: uuid.UUID, body: WritingSessionIn, user: CurrentUser, db: DbSession
) -> WritingSession:
    """Create or update. The client picks the id, so autosaves and offline retries are safe."""
    if body.technique_id is not None:
        get_owned(db, CraftNote, body.technique_id, user, in_trash=True)  # only your own techniques
    session = find_owned(db, WritingSession, session_id, user)
    if session is None:
        session = WritingSession(id=session_id, user_id=user.id)
        db.add(session)
    data = body.model_dump(mode="json")
    session.title = data["title"]
    session.content = data["content"]
    session.ink = data["ink"]
    session.ink_strokes = len(data["ink"])
    session.ink_pages = data["ink_pages"]
    session.timer_seconds = data["timer_seconds"]
    session.joke_ids = data["joke_ids"]
    session.observation_ids = data["observation_ids"]
    session.technique_id = body.technique_id
    db.commit()  # the session keeps its values (and its new updated_at) after the commit
    return session


@router.delete("/sessions/{session_id}", status_code=204)
def delete_session(session_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    move_to_trash(db, user, WritingSession, session_id)
