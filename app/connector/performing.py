"""Performing tools: your sets, and the shows you logged."""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.connector.jokes import NOT_SURE, brief, load_names, topic_name, user_jokes
from app.connector.library import parse_id
from app.connector.set_beats import beats_out, label_names, live_beats
from app.connector.show_record import jokes_done
from app.connector.text import clip, day, ist_date, matches, page
from app.models import Joke, PerformanceLog, Setlist, User
from app.schemas.set_beats import PieceIn
from app.services.set_beats import (
    Jokes,
    beat_seconds,
    cluster_leads,
    items_from,
    piece_lists,
    shown,
    stored_beats,
)


def sets_query(user: User) -> Any:
    return (
        select(Setlist)
        .where(Setlist.user_id == user.id)
        .options(
            selectinload(Setlist.items), selectinload(Setlist.venue), selectinload(Setlist.tags)
        )
        .order_by(Setlist.updated_at.desc())
    )


def summary(
    s: Setlist, jokes: dict[uuid.UUID, Joke], leads: dict[uuid.UUID, uuid.UUID]
) -> dict[str, Any]:
    """A set at a glance. Jokes in the Trash are left out, as in the app. A set with beats runs
    as long as its beats, and counts the jokes they play now; one from before beats runs as
    long as its jokes that aren't optional."""
    items = [i for i in s.items if i.joke_id in jokes]
    if s.beats is None:
        runtime = sum(jokes[i.joke_id].duration_seconds for i in items if not i.optional)
        count = len(items)
    else:
        runtime = beat_seconds(stored_beats(s))
        live = shown(stored_beats(s), Jokes(set(), {j: 0 for j in jokes}, leads))
        count = len(items_from(live))
    return {
        "id": str(s.id),
        "name": s.name,
        "point": s.point or None,
        "status": s.status,
        "tags": [t.name for t in s.tags],
        "rating": s.rating,
        "venue": s.venue.name if s.venue else None,
        "target_seconds": s.target_seconds,
        "runtime_seconds": runtime,
        "beat_count": len(stored_beats(s)),
        "jokes": count,
        "updated": ist_date(s.updated_at),
    }


def list_sets(db: Session, user: User) -> dict[str, Any]:
    jokes = {j.id: j for j in user_jokes(db, user)}
    leads = cluster_leads(db, user)
    return {"sets": [summary(s, jokes, leads) for s in db.scalars(sets_query(user))]}


def role(place: int, size: int) -> str | None:
    """Opener and closer aren't stored: they're the first and last places."""
    if place == 1:
        return "opener"
    return "closer" if place == size else None


def get_set(db: Session, user: User, set_id: str) -> dict[str, Any]:
    """A set's beats, and every joke in running order with its topic, premise, strength, time,
    vibe and Generic answer. Each joke in a beat points to its place in the running order."""
    wanted = parse_id(set_id)
    s = db.scalar(sets_query(user).where(Setlist.id == wanted))  # just this set
    if s is None:
        raise ValueError(f"No set with id {set_id}")
    names = load_names(db, user)
    leads = cluster_leads(db, user)
    # Only the jokes it can play: its own, and the leads of its clusters.
    stored = [p for ps in piece_lists(stored_beats(s)) for p in ps]
    ids = {p.joke_id for p in stored} | {i.joke_id for i in s.items}
    ids |= {leads[p.cluster_id] for p in stored if p.cluster_id in leads}
    jokes = {j.id: j for j in user_jokes(db, user, ids)}
    beats = live_beats(db, user, s, set(jokes))
    pieces: list[PieceIn] = [p for ps in piece_lists(beats) for p in ps]
    places = {p.id: n for n, p in enumerate(pieces, start=1)}
    running = []
    topics: dict[str, int] = {}
    for place, piece in enumerate(pieces, start=1):
        joke = jokes[piece.joke_id]
        topic = topic_name(names, joke.topic_id)
        topics[topic] = topics.get(topic, 0) + 1
        running.append(
            {
                "place": place,
                "role": role(place, len(pieces)),
                "optional": piece.loose,  # for readers from before beats: the same as loose
                "loose": piece.loose,
                **brief(joke, names),
                "premise": names.premises.get(joke.premise_id) if joke.premise_id else None,
                "vibe": names.personas.get(joke.persona or "", NOT_SURE),
                "generic": joke.generic,
                "follows_id": str(joke.follows_id) if joke.follows_id else None,
            }
        )
    return {
        **summary(s, jokes, leads),
        "topics": topics,
        "beats": beats_out(beats, label_names(db, user), names, places),
        "running_order": running,
    }


def lpm(laughs: list[int] | None, seconds: int) -> float | None:
    """Laughs per minute, as the app works it out: points (1-5 per laugh) over minutes."""
    if not laughs or seconds <= 0:
        return None
    points = sum(n * (i + 1) for i, n in enumerate(laughs))
    return round(points / (seconds / 60), 1)


def where_and_what(log: PerformanceLog) -> list[str]:
    """A show's venue and topic names, for searching."""
    return [log.venue.name if log.venue else "", *(t.name for t in log.topics)]


def on_dates(log: PerformanceLog, since: str, until: str) -> bool:
    """Whether a show's IST date falls in the range (either end may be empty)."""
    performed = ist_date(log.performed_at) or ""
    return since <= performed and (not until or performed <= until)


def list_shows(
    db: Session,
    user: User,
    query: str = "",
    limit: int = 25,
    since: str = "",
    until: str = "",
    offset: int = 0,
) -> dict[str, Any]:
    """Logged shows, newest first, on IST dates from `since` to `until` (both included), and the
    LPM across every one of them with a laugh count, not only the page shown."""
    since, until = day(since, "since"), day(until, "until")
    logs = db.scalars(
        select(PerformanceLog)
        .where(PerformanceLog.user_id == user.id)
        .options(selectinload(PerformanceLog.venue), selectinload(PerformanceLog.topics))
        .options(selectinload(PerformanceLog.review))
        .order_by(PerformanceLog.performed_at.desc())
    )
    names = load_names(db, user)
    found = [
        log
        for log in logs
        if matches(query, log.notes, log.learned, *where_and_what(log))
        and on_dates(log, since, until)
    ]
    counted = [log for log in found if lpm(log.laughs, log.duration_seconds) is not None]
    points = sum(sum(n * (i + 1) for i, n in enumerate(log.laughs or [])) for log in counted)
    minutes = sum(log.duration_seconds for log in counted) / 60
    shown, total = page(found, limit, offset=offset)
    after = max(0, offset) + len(shown)
    done = jokes_done(db, user, shown)
    return {
        "total": total,
        "next_offset": after if after < total else None,
        "average_lpm": round(points / minutes, 1) if minutes else None,
        "shows_with_laughs_counted": len(counted),
        "shows": [
            {
                "show_id": str(log.id),
                "performed_at": log.performed_at.isoformat(),
                "date": ist_date(log.performed_at),
                "venue": log.venue.name if log.venue else "Unidentified Venue",
                "minutes": round(log.duration_seconds / 60, 1),
                "audience": log.audience_size,
                "rating": log.rating,
                "lpm": lpm(log.laughs, log.duration_seconds),
                "laughs_by_points": log.laughs,
                "topics": [topic_name(names, t.id) for t in log.topics],
                "jokes": done.get(log.id, []),
                "reviewed_by": log.review.engine_version if log.review else None,
                "notes": clip(log.notes, 4000),  # whole, but for a very long one ("…": log_show
                "learned": clip(log.learned, 4000),  # then keeps the stored text)
            }
            for log in shown
        ],
    }
