"""log_show: the connector's one write. The set-review engine logs a show the comic reviewed with
it in a chat: the details they gave, the laugh tally and each joke's result, plus the laugh
timeline it heard. Saving goes through the same code as the app (services/show_logs.py)."""

import uuid
from datetime import datetime
from typing import Any

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.connector.performing import lpm
from app.connector.text import ist_date
from app.models import Joke, User
from app.schemas.reviews import ReviewIn
from app.schemas.shows import LogIn
from app.services.show_logs import save_show


def show_id(raw: str) -> uuid.UUID:
    """The show to update, or a new id. Logging the same id again replaces that show's details."""
    if not raw:
        return uuid.uuid4()
    try:
        return uuid.UUID(raw)
    except ValueError:
        raise ValueError(f"{raw!r} isn't a show id") from None


def topics_of(db: Session, user: User, jokes: list[dict[str, Any]]) -> list[uuid.UUID]:
    """The topics a show covered: those of the jokes done, each once, in running order."""
    ids = []
    for joke in jokes:
        try:
            ids.append(uuid.UUID(str(joke.get("joke_id"))))
        except ValueError:
            continue
    rows = db.execute(
        select(Joke.id, Joke.topic_id).where(Joke.id.in_(ids), Joke.user_id == user.id)
    )
    topic_of = {joke_id: topic_id for joke_id, topic_id in rows}
    return list(dict.fromkeys(topic_of[i] for i in ids if i in topic_of))


def problem(exc: ValidationError) -> str:
    """A validation error as one readable line per field."""
    return "; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors())


def log_show(db: Session, user: User, raw_id: str, show: dict[str, Any]) -> dict[str, Any]:
    """Save the show and say what was kept."""
    jokes = show.get("jokes") or []
    try:
        body = LogIn.model_validate({**show, "topic_ids": topics_of(db, user, jokes)})
        review = ReviewIn.model_validate(
            {"engine_version": show.get("engine_version"), "events": show.get("events") or []}
        )
    except ValidationError as exc:
        raise ValueError(problem(exc)) from None
    try:
        log = save_show(db, user, show_id(raw_id), body, review)
    except HTTPException as exc:
        raise ValueError(str(exc.detail)) from None
    return {
        "show_id": str(log.id),
        "date": ist_date(log.performed_at),
        "title": log.title,
        "venue": log.venue.name if log.venue else "Unidentified Venue",
        "lpm": lpm(log.laughs, log.duration_seconds),
        "jokes_logged": len(log.jokes),
        "events_kept": len(log.review.events) if log.review else 0,
    }


def when(performed_at: str) -> datetime:
    """An ISO date and time; one without a zone is read as IST, where the comic performs."""
    value = datetime.fromisoformat(performed_at)
    return value if value.tzinfo else datetime.fromisoformat(performed_at + "+05:30")
