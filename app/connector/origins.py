"""Where material came from, as Claude sees it: the brainstorms an observation was used in and the
voice notes behind a joke. Only what's out of the Trash counts, as in the app."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Joke, User, VoiceNote, WritingSession


def brainstorms_using(db: Session, user: User) -> dict[str, list[str]]:
    """For each observation id, the brainstorm sessions it's linked to (the session holds the
    link, so this reads them)."""
    using: dict[str, list[str]] = {}
    rows = db.execute(
        select(WritingSession.id, WritingSession.observation_ids).where(
            WritingSession.user_id == user.id
        )
    )
    for session_id, observation_ids in rows:
        for obs_id in observation_ids or []:
            using.setdefault(str(obs_id), []).append(str(session_id))
    return using


def joke_voice_links(db: Session, user: User) -> list[tuple[uuid.UUID, list[str]]]:
    """Each of your jokes (out of the Trash) with the voice note ids it holds."""
    rows = db.execute(select(Joke.id, Joke.voice_note_ids).where(Joke.user_id == user.id))
    return [(joke_id, list(ids or [])) for joke_id, ids in rows]


def voice_notes_behind(db: Session, user: User) -> dict[str, list[dict[str, str]]]:
    """For each joke id, the voice notes it came from: `{id, label}`."""
    notes = {
        str(i): label
        for i, label in db.execute(
            select(VoiceNote.id, VoiceNote.label).where(VoiceNote.user_id == user.id)
        )
    }
    behind: dict[str, list[dict[str, str]]] = {}
    for joke_id, ids in joke_voice_links(db, user):
        behind[str(joke_id)] = [{"id": i, "label": notes[i]} for i in ids or [] if i in notes]
    return behind


def jokes_from_voice(db: Session, user: User) -> dict[str, list[str]]:
    """For each voice note id, the jokes written from it."""
    found: dict[str, list[str]] = {}
    for joke_id, ids in joke_voice_links(db, user):
        for note_id in ids or []:
            found.setdefault(note_id, []).append(str(joke_id))
    return found
