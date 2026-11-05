"""Edits made on two devices. A save says which version it was edited from (`base_version`); if
the thing has moved on since and the save would change it, the save is refused with a 409
rather than written over the other device's edit. Jokes do the same in services/jokes.py."""

from collections.abc import Callable
from typing import Any

from fastapi import HTTPException

from app.models import CraftNote, Observation, Premise, Setlist, WritingSession
from app.schemas.notebook import WritingSessionIn
from app.schemas.shows import SetlistIn, SetlistOut

SET_CLASH = "This set was changed on another device after you edited it."
SESSION_CLASH = "This session was changed on another device after you edited it."
NOTE_CLASH = "This note was changed on another device after you edited it."
OBSERVATION_CLASH = "This observation was changed on another device after you edited it."
PREMISE_CLASH = "This premise was changed on another device after you edited it."


def refuse_stale(current: int, base: int | None, unchanged: Callable[[], bool], why: str) -> None:
    """Refuse an edit made from an older version. Without a base (a new thing, an older app)
    nothing is checked; a stale save that changes nothing is a retry, and harmless."""
    if base is not None and base != current and not unchanged():
        raise HTTPException(409, why)


def same_set(now: SetlistOut, body: SetlistIn) -> bool:
    """Would this save leave the set as it is? Times follow the jokes, so only the jokes, their
    order and which are optional count, beside the set's own details."""
    return (
        (now.name, now.show_date, now.target_seconds, now.venue_name, now.rating)
        == (body.name, body.show_date, body.target_seconds, body.venue_name, body.rating)
        and set(now.tag_ids) == set(body.tag_ids)
        and [(i.joke_id, i.optional) for i in now.items]
        == [(i.joke_id, i.optional) for i in body.items]
    )


def check_set(setlist: Setlist, body: SetlistIn, now: Callable[[], SetlistOut]) -> None:
    """Refuse a set edited from an older version; else count this save as a new version."""
    refuse_stale(setlist.version, body.base_version, lambda: same_set(now(), body), SET_CLASH)
    setlist.version += 1


def same_session(session: WritingSession, data: dict[str, Any]) -> bool:
    """Would this save (as JSON) leave the session as it is? Only asked of a stale save, so the
    ink is read just then."""
    technique = str(session.technique_id) if session.technique_id else None
    fields = ("title", "content", "ink", "ink_pages", "timer_seconds", "joke_ids")
    return (
        all(getattr(session, f) == data[f] for f in fields)
        and session.observation_ids == data["observation_ids"]
        and technique == data["technique_id"]
    )


def check_session(session: WritingSession, body: WritingSessionIn, data: dict[str, Any]) -> None:
    """Refuse a session edited from an older version; else count this save as a new version."""
    unchanged = lambda: same_session(session, data)  # noqa: E731
    refuse_stale(session.version, body.base_version, unchanged, SESSION_CLASH)
    session.version += 1


def check_fields(
    thing: CraftNote | Observation | Premise, base: int | None, fields: dict[str, Any], why: str
) -> None:
    """For things saved field by field: refuse an edit made from an older version that would
    change any of `fields`; else count this save as a new version."""
    unchanged = lambda: all(getattr(thing, k) == v for k, v in fields.items())  # noqa: E731
    refuse_stale(thing.version, base, unchanged, why)
    thing.version += 1
