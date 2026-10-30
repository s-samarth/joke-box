"""Performing tools: your sets, and the shows you logged."""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.connector.jokes import brief, load_names, topic_name, user_jokes
from app.connector.library import parse_id
from app.connector.text import clip, ist_date, matches, page
from app.models import Joke, PerformanceLog, Setlist, User


def sets_query(user: User) -> Any:
    return (
        select(Setlist)
        .where(Setlist.user_id == user.id)
        .options(
            selectinload(Setlist.items), selectinload(Setlist.venue), selectinload(Setlist.tags)
        )
        .order_by(Setlist.updated_at.desc())
    )


def summary(s: Setlist, jokes: dict[uuid.UUID, Joke]) -> dict[str, Any]:
    """A set at a glance. Jokes in the Trash are left out, as in the app."""
    items = [i for i in s.items if i.joke_id in jokes]
    return {
        "id": str(s.id),
        "name": s.name,
        "tags": [t.name for t in s.tags],
        "rating": s.rating,
        "venue": s.venue.name if s.venue else None,
        "target_seconds": s.target_seconds,
        "runtime_seconds": sum(jokes[i.joke_id].duration_seconds for i in items if not i.optional),
        "jokes": len(items),
        "updated": ist_date(s.updated_at),
    }


def list_sets(db: Session, user: User) -> dict[str, Any]:
    jokes = {j.id: j for j in user_jokes(db, user)}
    return {"sets": [summary(s, jokes) for s in db.scalars(sets_query(user))]}


def role(place: int, size: int) -> str | None:
    """Opener and closer aren't stored: they're the first and last places."""
    if place == 1:
        return "opener"
    return "closer" if place == size else None


def get_set(db: Session, user: User, set_id: str) -> dict[str, Any]:
    """A set in running order, with each joke's topic, premise, strength and time."""
    wanted = parse_id(set_id)
    s = next((s for s in db.scalars(sets_query(user)) if s.id == wanted), None)
    if s is None:
        raise ValueError(f"No set with id {set_id}")
    names = load_names(db, user)
    jokes = {j.id: j for j in user_jokes(db, user)}
    items = [i for i in s.items if i.joke_id in jokes]
    running = []
    topics: dict[str, int] = {}
    for place, item in enumerate(items, start=1):
        joke = jokes[item.joke_id]
        topic = topic_name(names, joke.topic_id)
        topics[topic] = topics.get(topic, 0) + 1
        running.append(
            {
                "place": place,
                "role": role(place, len(items)),
                "optional": item.optional,
                **brief(joke, names),
                "premise": names.premises.get(joke.premise_id) if joke.premise_id else None,
                "follows_id": str(joke.follows_id) if joke.follows_id else None,
            }
        )
    return {**summary(s, jokes), "topics": topics, "running_order": running}


def lpm(laughs: list[int] | None, seconds: int) -> float | None:
    """Laughs per minute, as the app works it out: points (1-5 per laugh) over minutes."""
    if not laughs or not any(laughs) or seconds <= 0:
        return None
    points = sum(n * (i + 1) for i, n in enumerate(laughs))
    return round(points / (seconds / 60), 1)


def where_and_what(log: PerformanceLog) -> list[str]:
    """A show's venue and topic names, for searching."""
    return [log.venue.name if log.venue else "", *(t.name for t in log.topics)]


def list_shows(db: Session, user: User, query: str = "", limit: int = 25) -> dict[str, Any]:
    """Logged shows, newest first, and the LPM across every show with a laugh count."""
    logs = db.scalars(
        select(PerformanceLog)
        .where(PerformanceLog.user_id == user.id)
        .options(selectinload(PerformanceLog.venue), selectinload(PerformanceLog.topics))
        .order_by(PerformanceLog.performed_at.desc())
    )
    names = load_names(db, user)
    found = [log for log in logs if matches(query, log.notes, *where_and_what(log))]
    counted = [log for log in found if lpm(log.laughs, log.duration_seconds) is not None]
    points = sum(sum(n * (i + 1) for i, n in enumerate(log.laughs or [])) for log in counted)
    minutes = sum(log.duration_seconds for log in counted) / 60
    shown, total = page(found, limit)
    return {
        "total": total,
        "average_lpm": round(points / minutes, 1) if minutes else None,
        "shows_with_laughs_counted": len(counted),
        "shows": [
            {
                "date": ist_date(log.performed_at),
                "venue": log.venue.name if log.venue else "Unidentified Venue",
                "minutes": round(log.duration_seconds / 60, 1),
                "audience": log.audience_size,
                "rating": log.rating,
                "lpm": lpm(log.laughs, log.duration_seconds),
                "laughs_by_points": log.laughs,
                "topics": [topic_name(names, t.id) for t in log.topics],
                "notes": clip(log.notes, 600),
            }
            for log in shown
        ],
    }
