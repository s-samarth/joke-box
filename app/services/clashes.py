"""Edits made on two devices. A save says which version it was edited from (`base_version`); if
the thing has moved on since and the save would change it, the save is refused with a 409
rather than written over the other device's edit. Jokes use the same rule in services/jokes.py.

Only a save that changes something makes a new version. One that changes nothing (Save pressed
with no edit, text typed and deleted again, a retry whose answer was lost) leaves the version as
it is, so it can't put another device's waiting edit in a clash over nothing."""

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


def next_version(current: int, base: int | None, unchanged: Callable[[], bool], why: str) -> int:
    """The version after this save: the same if it changes nothing, else one more. An edit made
    from an older version that would change something is refused (409). Without a base (a new
    thing, an older app) nothing is checked."""
    if unchanged():
        return current
    if base is not None and base != current:
        raise HTTPException(409, why)
    return current + 1


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
    """Refuse a set edited from an older version; else move its version on if this changes it."""
    unchanged = lambda: same_set(now(), body)  # noqa: E731
    setlist.version = next_version(setlist.version, body.base_version, unchanged, SET_CLASH)


def same_session(session: WritingSession, data: dict[str, Any]) -> bool:
    """Would this save (as JSON) leave the session as it is? Asked of every save, so the cheap
    fields go first: the old ink, the big one, is read only when all else matches, its stroke
    count included, which a save of new handwriting almost never does."""
    technique = str(session.technique_id) if session.technique_id else None
    fields = ("title", "content", "ink_pages", "timer_seconds", "joke_ids", "observation_ids")
    return (
        all(getattr(session, f) == data[f] for f in fields)
        and technique == data["technique_id"]
        and session.ink_strokes == len(data["ink"])
        and session.ink == data["ink"]
    )


def check_session(session: WritingSession, body: WritingSessionIn, data: dict[str, Any]) -> None:
    """Refuse a session edited from an older version; else move its version on if it changes."""
    unchanged = lambda: same_session(session, data)  # noqa: E731
    session.version = next_version(session.version, body.base_version, unchanged, SESSION_CLASH)


def check_fields(
    thing: CraftNote | Observation | Premise, base: int | None, fields: dict[str, Any], why: str
) -> None:
    """For things saved field by field: refuse an edit made from an older version that would
    change any of `fields`; else move its version on if this changes it."""
    unchanged = lambda: all(getattr(thing, k) == v for k, v in fields.items())  # noqa: E731
    thing.version = next_version(thing.version, base, unchanged, why)
