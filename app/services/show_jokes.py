"""Which jokes were done at a show, in running order, and how each went."""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Joke, PerformanceJoke, PerformanceLog, User
from app.schemas.shows import LogJokeIn, LogJokeOut


def your_jokes(db: Session, user: User, sent: list[LogJokeIn]) -> set[uuid.UUID]:
    """Which of the sent jokes are this user's live jokes."""
    ids = {joke.joke_id for joke in sent}
    if not ids:
        return set()
    return set(db.scalars(select(Joke.id).where(Joke.id.in_(ids), Joke.user_id == user.id)))


def wanted(sent: list[LogJokeIn], hidden: set[uuid.UUID], yours: set[uuid.UUID]) -> list[LogJokeIn]:
    """The jokes a save asks for, each once, and only your own. A joke deleted on another device
    while the save waited keeps its place, hidden like any joke in the Trash (see set_jokes); one
    erased for good, or never yours, is left out rather than failing a save that waited offline."""
    seen: set[uuid.UUID] = set()
    out: list[LogJokeIn] = []
    for joke in sent:
        if joke.joke_id in yours and joke.joke_id not in hidden and joke.joke_id not in seen:
            seen.add(joke.joke_id)
            out.append(joke)
    return out


def set_jokes(log: PerformanceLog, sent: list[LogJokeIn], hidden: set[uuid.UUID]) -> None:
    """Make the show's jokes `sent`, in order. Rows for jokes already there are updated rather
    than replaced (a joke is on a show once). Jokes in the Trash aren't sent by the app, so their
    places are kept for when they come back."""
    existing = {row.joke_id: row for row in log.jokes}
    rows: list[PerformanceJoke] = []
    for joke in sent:
        row = existing.get(joke.joke_id) or PerformanceJoke(joke_id=joke.joke_id, position=0)
        row.result = joke.result
        if joke.note is not None:
            row.note = joke.note.strip()
        rows.append(row)
    for away in sorted(log.jokes, key=lambda r: r.position):
        if away.joke_id in hidden:
            rows.insert(min(away.position, len(rows)), away)
    for n, row in enumerate(rows):
        row.position = n
    log.jokes = rows


def jokes_out(log: PerformanceLog, hidden: set[uuid.UUID]) -> list[LogJokeOut]:
    """A show's jokes as the app sees them: ones in the Trash are left out until they're back."""
    return [
        LogJokeOut(joke_id=row.joke_id, result=row.result, note=row.note or "")  # type: ignore[arg-type]
        for row in log.jokes
        if row.joke_id not in hidden
    ]
