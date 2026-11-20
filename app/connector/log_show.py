"""log_show: the connector's one write. The set-review engine logs a show the comic reviewed with
it in a chat: the details they gave, the topics they did, the laugh tally and each joke's result,
plus the laugh timeline it heard, and what they learned (a Craft note linked to the show, as the
app's "What did you learn?" saves it). Saving goes through the same code as the app
(services/show_logs.py)."""

import uuid
from datetime import datetime
from typing import Any

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.connector.performing import lpm
from app.connector.show_lesson import save_lesson
from app.connector.text import ist_date
from app.models import Joke, Topic, User
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


def topics_named(db: Session, user: User, names: list[str]) -> list[uuid.UUID]:
    """The comic's topics by name (any case). A name that matches none is refused, listing the
    topics there are: the comic picks one, or makes a new one in JokeBox first."""
    wanted = [n.strip() for n in names if n.strip()]
    if not wanted:
        return []
    rows = db.execute(
        select(Topic.id, Topic.name).where(
            Topic.user_id == user.id, func.lower(Topic.name).in_([n.lower() for n in wanted])
        )
    )
    found = {name.lower(): topic_id for topic_id, name in rows}
    missing = [n for n in wanted if n.lower() not in found]
    if missing:
        every = db.scalars(select(Topic.name).where(Topic.user_id == user.id).order_by(Topic.name))
        raise ValueError(f"No topic named {', '.join(missing)}. The topics are: {', '.join(every)}")
    return list(dict.fromkeys(found[n.lower()] for n in wanted))


def random_topic(db: Session, user: User) -> list[uuid.UUID]:
    """Random, the topic a show gets when nothing else says what it was about."""
    found = db.scalar(select(Topic.id).where(Topic.user_id == user.id, Topic.is_system))
    return [found] if found else []


def problem(exc: ValidationError) -> str:
    """A validation error as one readable line per field."""
    return "; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in exc.errors())


def log_show(db: Session, user: User, raw_id: str, show: dict[str, Any]) -> dict[str, Any]:
    """Save the show and say what was kept."""
    jokes = show.get("jokes") or []
    named = topics_named(db, user, show.get("topics") or [])
    topic_ids = list(dict.fromkeys(named + topics_of(db, user, jokes))) or random_topic(db, user)
    try:
        body = LogIn.model_validate({**show, "topic_ids": topic_ids})
        review = ReviewIn.model_validate(
            {"engine_version": show.get("engine_version"), "events": show.get("events") or []}
        )
    except ValidationError as exc:
        raise ValueError(problem(exc)) from None
    try:
        log = save_show(db, user, show_id(raw_id), body, review)
    except HTTPException as exc:
        raise ValueError(str(exc.detail)) from None
    lesson = save_lesson(db, user, log, show.get("learned") or "")
    return {
        "show_id": str(log.id),
        "date": ist_date(log.performed_at),
        "venue": log.venue.name if log.venue else "Unidentified Venue",
        "topics": [t.name for t in log.topics],
        "lesson": lesson.title if lesson else None,
        "lpm": lpm(log.laughs, log.duration_seconds),
        "jokes_logged": len(log.jokes),
        "events_kept": len(log.review.events) if log.review else 0,
    }


def when(performed_at: str) -> datetime:
    """An ISO date and time; one without a zone is read as IST, where the comic performs."""
    value = datetime.fromisoformat(performed_at)
    return value if value.tzinfo else datetime.fromisoformat(performed_at + "+05:30")
