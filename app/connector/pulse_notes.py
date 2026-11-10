"""The pulse's plain sentences, each from a simple rule over what's saved (no AI, no guessing):
a kind not written in weeks, the topic with the biggest pile of observations nothing has come
from, and when the comic tends to write. At most three, most useful first.

The same rules as web/src/features/daily/pulseNotes.ts: change them together.
"""

from __future__ import annotations

from collections import Counter
from datetime import date, datetime
from typing import TYPE_CHECKING

from app.connector.text import IST

if TYPE_CHECKING:
    from app.connector.pulse import JokeRow, NotedRow, PremiseRow

# A kind gone this many days without a new one is worth a mention.
QUIET = 21
# A topic needs this many observations, and this many unused, to count as a pile.
PILE = 5
UNUSED = 3
# When the comic writes is read from the last 90 days, once there are this many pieces.
WINDOW = 90
ENOUGH = 10
DAYS = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"]


def ago(moment: datetime, today: date) -> int:
    return (today - moment.astimezone(IST).date()).days


def part_of_day(hour: int) -> str:
    """Morning is 5 to noon, afternoon to 5, evening to 10, and the rest is night."""
    if 5 <= hour < 12:
        return "in the morning"
    if 12 <= hour < 17:
        return "in the afternoon"
    if 17 <= hour < 22:
        return "in the evening"
    return "at night"


def quiet(
    jokes: list[JokeRow], premises: list[PremiseRow], noted: list[NotedRow], today: date
) -> str | None:
    """The kind quiet longest (and written before): No new premise in 24 days."""
    kinds: list[tuple[str, list[datetime]]] = [
        ("observation", [o.created_at for o in noted]),
        ("premise", [p.created_at for p in premises]),
        ("joke", [j.created_at for j in jokes]),
    ]
    gaps = [(min(ago(m, today) for m in when), one) for one, when in kinds if when]
    if not gaps:
        return None
    days, one = max(gaps, key=lambda gap: gap[0])  # the first of a tie, as the app picks
    return f"No new {one} in {days} days." if days >= QUIET else None


def pile(noted: list[NotedRow]) -> str | None:
    """The topic whose observations have gone furthest unused."""
    topics: dict[str | None, list[NotedRow]] = {}
    for o in noted:
        topics.setdefault(o.topic_id, []).append(o)
    piles = [
        (sum(not o.used for o in rows), rows)
        for rows in topics.values()
        if len(rows) >= PILE and sum(not o.used for o in rows) >= UNUSED
    ]
    if not piles:
        return None
    unused, rows = max(piles, key=lambda found: found[0])
    name = rows[0].topic
    jokes = len({i for o in rows for i in o.joke_ids})
    came = "no joke has" if jokes == 0 else "1 joke has" if jokes == 1 else f"{jokes} jokes have"
    return (
        f"{name} holds {len(rows)} observations and {came} come from them: "
        f"{unused} are still unused."
    )


def rhythm(
    jokes: list[JokeRow], premises: list[PremiseRow], noted: list[NotedRow], today: date
) -> str | None:
    """The weekday and part of the day most pieces were written on."""
    written = [p.created_at for rows in (jokes, premises, noted) for p in rows]
    when = [m.astimezone(IST) for m in written if ago(m, today) < WINDOW]
    if len(when) < ENOUGH:
        return None
    [(day, count)] = Counter(m.isoweekday() % 7 for m in when).most_common(1)
    [(part, _)] = Counter(part_of_day(m.hour) for m in when).most_common(1)
    return (
        f"You write most on {DAYS[day]} ({count} of your last {len(when)} pieces), "
        f"and mostly {part}."
    )


def notes(
    jokes: list[JokeRow], premises: list[PremiseRow], noted: list[NotedRow], today: date
) -> list[str]:
    found = [
        quiet(jokes, premises, noted, today),
        pile(noted),
        rhythm(jokes, premises, noted, today),
    ]
    return [n for n in found if n is not None]
