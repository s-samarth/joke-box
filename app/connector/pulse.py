"""The writing pulse, as Claude reads it: how the writing is going, worked out from what's saved.

The Activity screen works out the same numbers in the browser (web/src/features/daily/pulse.ts,
pulseTrends.ts and pulseNotes.ts), so it works offline. The two are separate code: a rule
changed in one must change in the other. tests/test_connector_pulse.py runs the
same made-up cases as pulse.test.ts, with the same answers.
"""

from datetime import date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.connector.notebook import live_links
from app.connector.origins import brainstorms_using
from app.connector.pulse_notes import notes
from app.connector.pulse_rows import (
    DEFAULT_STATUS,
    JokeRow,
    NotedRow,
    PremiseRow,
    days_ago,
    narrowest,
    status_of,
    steps_of,
    within,
)
from app.connector.pulse_trends import month_on_month, rhythm
from app.connector.text import IST
from app.models import Joke, Observation, Premise, Status, Topic, User
from app.models.library import PREMISE_STATUSES

__all__ = ["JokeRow", "NotedRow", "PremiseRow", "days_ago", "work_out", "writing_pulse"]

WINDOW = 90
# A draft nobody has touched for this many days is sitting idle.
STALE = 30


def standing(
    jokes: list[JokeRow], premises: list[PremiseRow], noted: list[NotedRow], order: list[str]
) -> dict[str, dict[str, int]]:
    """Each kind by status: observations and premises by the four they share, jokes in the
    comic's own status order (any other name after)."""
    by_status: dict[str, int] = {}
    for j in jokes:
        by_status[status_of(j.status)] = by_status.get(status_of(j.status), 0) + 1
    names = [s for s in order if s in by_status] + [s for s in by_status if s not in order]
    return {
        "observations": {s: sum(o.status == s for o in noted) for s in PREMISE_STATUSES},
        "premises": {s: sum(p.status == s for p in premises) for s in PREMISE_STATUSES},
        "jokes": {s: by_status[s] for s in names},
    }


def work_out(
    jokes: list[JokeRow],
    premises: list[PremiseRow],
    noted: list[NotedRow],
    today: date,
    status_order: list[str] | None = None,
) -> dict[str, Any]:
    """The pulse from plain rows."""
    built = {j.premise_id for j in jokes if j.premise_id}
    steps = steps_of(
        built,
        within(noted, today, 0, WINDOW),
        within(premises, today, 0, WINDOW),
        within(jokes, today, 0, WINDOW),
    )
    stale = [
        j
        for j in jokes
        if status_of(j.status) == DEFAULT_STATUS and days_ago(j.updated_at, today) >= STALE
    ]
    idle = [
        ("observations unused", sum(not o.used for o in noted)),
        ("premises with no joke", sum(p.id not in built for p in premises)),
        (f"drafts untouched for {STALE} days", len(stale)),
    ]
    thin = len(jokes) + len(premises) + len(noted) < 5
    return {
        "as_of": today.isoformat(),
        "too_little_yet": thin,
        "where_everything_stands": standing(
            jokes, premises, noted, status_order or [DEFAULT_STATUS]
        ),
        "how_far_ideas_got": steps,
        "narrowest_step": None if thin else narrowest(steps),
        "month_on_month": month_on_month(jokes, premises, noted, built, today),
        "when_you_write": rhythm(jokes, premises, noted, today),
        "sitting_idle": [{"what": what, "count": count} for what, count in idle if count],
        "worth_knowing": [] if thin else notes(jokes, premises, noted, today),
    }


def writing_pulse(db: Session, user: User, today: date | None = None) -> dict[str, Any]:
    """The pulse for one user, over everything of theirs that's out of the Trash. Rows come in
    the order the app lists them, so a tie between two topics or weekdays falls the same way."""
    topics = {
        topic_id: "Random" if is_system else name
        for topic_id, name, is_system in db.execute(
            select(Topic.id, Topic.name, Topic.is_system).where(Topic.user_id == user.id)
        )
    }
    live_premises, live_jokes = live_links(db, user)
    sessions = brainstorms_using(db, user)
    jokes = [
        JokeRow(str(i), created, updated, status, str(p) if p else None)
        for i, created, updated, status, p in db.execute(
            select(Joke.id, Joke.created_at, Joke.updated_at, Status.name, Joke.premise_id)
            .outerjoin(Status, Joke.status_id == Status.id)
            .where(Joke.user_id == user.id)
            .order_by(Joke.created_at.desc())
        )
    ]
    premises = [
        PremiseRow(str(i), created, status)
        for i, created, status in db.execute(
            select(Premise.id, Premise.created_at, Premise.status)
            .where(Premise.user_id == user.id)
            .order_by(Premise.position, Premise.created_at)
        )
    ]
    noted = []
    for o in db.scalars(
        select(Observation)
        .where(Observation.user_id == user.id)
        .order_by(Observation.created_at.desc())
    ):
        from_it = tuple(i for i in o.joke_ids or [] if i in live_jokes)
        led = any(i in live_premises for i in o.premise_ids or [])
        used = bool(from_it) or led or str(o.id) in sessions
        topic_id = str(o.topic_id) if o.topic_id else None
        topic = (topics.get(o.topic_id) if o.topic_id else None) or "Random"
        row = NotedRow(str(o.id), o.created_at, topic_id, topic, from_it, used, o.status)
        noted.append(row)
    order = list(
        db.scalars(select(Status.name).where(Status.user_id == user.id).order_by(Status.position))
    )
    order = [DEFAULT_STATUS] + [s for s in order if s.lower() != DEFAULT_STATUS.lower()]
    return work_out(jokes, premises, noted, today or datetime.now(IST).date(), order)
