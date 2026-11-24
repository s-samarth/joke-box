"""The plain rows the writing pulse works from, and the rules every part of it shares.

The same rules as web/src/features/daily/pulse.ts: change them together.
"""

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any

from app.connector.text import IST

DEFAULT_STATUS = "Draft"
# A step needs this many ideas in it before it can be called the narrowest.
ENOUGH_TO_JUDGE = 5
STEPS = (
    "Observations that led somewhere",
    "Premises with a joke on them",
    "Jokes marked Stage Ready",
)


@dataclass(frozen=True)
class JokeRow:
    id: str
    created_at: datetime
    updated_at: datetime
    status: str | None = None
    premise_id: str | None = None


@dataclass(frozen=True)
class PremiseRow:
    id: str
    created_at: datetime
    status: str = "Draft"


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


def status_of(name: str | None) -> str:
    """A joke's status as the app shows it: none (or the retired Status Unknown) is Draft."""
    name = (name or "").strip()
    return DEFAULT_STATUS if not name or name.lower() == "status unknown" else name


def days_ago(moment: datetime, today: date) -> int:
    """How many days ago something was written (0 is today), by India's calendar."""
    return (today - moment.astimezone(IST).date()).days


def within[T: (JokeRow, PremiseRow, NotedRow)](
    rows: list[T], today: date, start: int, end: int
) -> list[T]:
    return [r for r in rows if start <= days_ago(r.created_at, today) < end]


def steps_of(
    built: set[str], noted: list[NotedRow], premises: list[PremiseRow], jokes: list[JokeRow]
) -> list[dict[str, Any]]:
    """How many observations led somewhere, premises got a joke, jokes reached Stage Ready."""
    done = [
        sum(o.used for o in noted),
        sum(p.id in built for p in premises),
        sum(status_of(j.status).lower() == "stage ready" for j in jokes),
    ]
    totals = [len(noted), len(premises), len(jokes)]
    return [
        {"step": label, "done": d, "of": of}
        for label, d, of in zip(STEPS, done, totals, strict=True)
    ]


def narrowest(steps: list[dict[str, Any]]) -> str | None:
    """The step with the lowest share through, of those with enough in them; first wins a tie."""
    low: dict[str, Any] | None = None
    for s in steps:
        if s["of"] >= ENOUGH_TO_JUDGE and (
            low is None or s["done"] / s["of"] < low["done"] / low["of"]
        ):
            low = s
    return low["step"] if low else None
