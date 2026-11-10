"""The writing pulse, as Claude reads it: how the writing is going, worked out from what's saved.

The Daily activity screen works out the same numbers in the browser
(web/src/features/daily/pulse.ts and pulseNotes.ts), so it works offline. The two are separate
code: a rule changed in one must change in the other. tests/test_connector_pulse.py runs the
same made-up cases as pulse.test.ts, with the same answers.
"""

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.connector.notebook import live_links
from app.connector.origins import brainstorms_using
from app.connector.pulse_notes import notes
from app.connector.text import IST
from app.models import Joke, Observation, Premise, Status, Topic, User

RECENT = 30
WINDOW = 90
# A draft nobody has touched for this many days is sitting idle.
STALE = 30
FINISHED = {"stage ready", "complete"}


@dataclass(frozen=True)
class JokeRow:
    id: str
    created_at: datetime
    updated_at: datetime
    punchline: str = ""
    status: str | None = None
    premise_id: str | None = None


@dataclass(frozen=True)
class PremiseRow:
    id: str
    created_at: datetime


@dataclass(frozen=True)
class NotedRow:
    """An observation: `joke_ids` are the jokes from it still out of the Trash, and `used` says
    a joke, premise or brainstorm came from it (the app's "Not used yet" test)."""

    id: str
    created_at: datetime
    topic_id: str | None = None
    topic: str = "Random"
    joke_ids: tuple[str, ...] = ()
    used: bool = False


def days_ago(moment: datetime, today: date) -> int:
    """How many days ago something was written (0 is today), by India's calendar."""
    return (today - moment.astimezone(IST).date()).days


def within[T: (JokeRow, PremiseRow, NotedRow)](
    rows: list[T], today: date, start: int, end: int
) -> list[T]:
    return [r for r in rows if start <= days_ago(r.created_at, today) < end]


def step(label: str, done: int, of: int) -> dict[str, Any]:
    return {"step": label, "done": done, "of": of}


def work_out(
    jokes: list[JokeRow], premises: list[PremiseRow], noted: list[NotedRow], today: date
) -> dict[str, Any]:
    """The pulse from plain rows: pace, how far ideas got, what's idle and what's worth knowing."""
    kinds: list[tuple[str, list[Any]]] = [
        ("observations", noted),
        ("premises", premises),
        ("jokes", jokes),
    ]
    written = [
        {
            "kind": kind,
            "last_30_days": len(within(rows, today, 0, RECENT)),
            "the_30_days_before": len(within(rows, today, RECENT, 2 * RECENT)),
        }
        for kind, rows in kinds
    ]

    built = {j.premise_id for j in jokes if j.premise_id}
    new_noted = within(noted, today, 0, WINDOW)
    new_premises = within(premises, today, 0, WINDOW)
    new_jokes = within(jokes, today, 0, WINDOW)
    finished = [j for j in new_jokes if (j.status or "").strip().lower() in FINISHED]
    steps = [
        step("Observations that led somewhere", sum(o.used for o in new_noted), len(new_noted)),
        step(
            "Premises with a joke on them",
            sum(p.id in built for p in new_premises),
            len(new_premises),
        ),
        step(
            "Jokes with a punchline",
            sum(bool(j.punchline.strip()) for j in new_jokes),
            len(new_jokes),
        ),
        step("Jokes marked Stage Ready or Complete", len(finished), len(new_jokes)),
    ]

    stale = [
        j for j in jokes if j.status in (None, "Draft") and days_ago(j.updated_at, today) >= STALE
    ]
    idle = [
        ("observations nothing has come from", sum(not o.used for o in noted)),
        ("premises with no joke yet", sum(p.id not in built for p in premises)),
        ("jokes without a punchline", sum(not j.punchline.strip() for j in jokes)),
        (f"drafts not touched in {STALE} days", len(stale)),
    ]
    thin = len(jokes) + len(premises) + len(noted) < 5
    return {
        "as_of": today.isoformat(),
        "too_little_yet": thin,
        "written": written,
        "how_far_ideas_got": steps,
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
        JokeRow(str(i), created, updated, punchline or "", status, str(p) if p else None)
        for i, created, updated, punchline, status, p in db.execute(
            select(
                Joke.id,
                Joke.created_at,
                Joke.updated_at,
                Joke.punchline,
                Status.name,
                Joke.premise_id,
            )
            .outerjoin(Status, Joke.status_id == Status.id)
            .where(Joke.user_id == user.id)
            .order_by(Joke.created_at.desc())
        )
    ]
    premises = [
        PremiseRow(str(i), created)
        for i, created in db.execute(
            select(Premise.id, Premise.created_at)
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
        noted.append(NotedRow(str(o.id), o.created_at, topic_id, topic, from_it, used))
    return work_out(jokes, premises, noted, today or datetime.now(IST).date())
