"""The pulse over time. Month on month: the last six calendar months, each counted on what was
written that month (how much, and how much of it has gone on since). No history of statuses is
kept, so recent months look worse until their ideas have had time, and are marked as still
settling. When the comic writes: the last 90 days by weekday and part of the day.

The same rules as web/src/features/daily/pulseTrends.ts: change them together.
"""

import calendar
from datetime import date
from typing import Any

from app.connector.pulse_rows import JokeRow, NotedRow, PremiseRow, steps_of, within
from app.connector.text import IST

MONTHS = 6
# A month that ended fewer than this many days ago is still settling.
SETTLE = 30
RHYTHM_DAYS = 90
ENOUGH = 10
PARTS = ("Morning", "Afternoon", "Evening", "Night")
WEEKDAYS = ("Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays")


def month_key(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}"


def last_months(today: date) -> list[tuple[int, int]]:
    """The last six (year, month) pairs, oldest first, ending with today's month."""
    index = today.year * 12 + today.month - 1
    return [divmod(i, 12) for i in range(index - MONTHS + 1, index + 1)]


def month_on_month(
    jokes: list[JokeRow],
    premises: list[PremiseRow],
    noted: list[NotedRow],
    built: set[str],
    today: date,
) -> list[dict[str, Any]]:
    rows = []
    for year, m0 in last_months(today):
        month = m0 + 1

        def written_in[T: (JokeRow, PremiseRow, NotedRow)](
            items: list[T], y: int = year, mo: int = month
        ) -> list[T]:
            return [
                i
                for i in items
                if (i.created_at.astimezone(IST).year, i.created_at.astimezone(IST).month)
                == (y, mo)
            ]

        o, p, j = written_in(noted), written_in(premises), written_in(jokes)
        end = date(year, month, calendar.monthrange(year, month)[1])
        rows.append(
            {
                "month": month_key(year, month),
                "pieces_written": len(o) + len(p) + len(j),
                "steps": steps_of(built, o, p, j),
                "still_settling": (today - end).days < SETTLE,
            }
        )
    return rows


def part_index(hour: int) -> int:
    """0 morning (5 to noon), 1 afternoon (to 5), 2 evening (to 10), 3 night."""
    if 5 <= hour < 12:
        return 0
    if 12 <= hour < 17:
        return 1
    if 17 <= hour < 22:
        return 2
    return 3


def rhythm(
    jokes: list[JokeRow], premises: list[PremiseRow], noted: list[NotedRow], today: date
) -> dict[str, Any] | None:
    recent: list[JokeRow | PremiseRow | NotedRow] = [
        *within(jokes, today, 0, RHYTHM_DAYS),
        *within(premises, today, 0, RHYTHM_DAYS),
        *within(noted, today, 0, RHYTHM_DAYS),
    ]
    if len(recent) < ENOUGH:
        return None
    grid = [[0] * len(PARTS) for _ in WEEKDAYS]
    for row in recent:
        local = row.created_at.astimezone(IST)
        grid[local.weekday()][part_index(local.hour)] += 1
    # The busiest cell; the first in the week (then the earliest in the day) wins a tie.
    count, day, part = max(
        ((n, -d, -p) for d, cells in enumerate(grid) for p, n in enumerate(cells)),
    )
    return {
        "busiest": {"day": WEEKDAYS[-day], "part": PARTS[-part], "count": count},
        "of_pieces": len(recent),
        "by_weekday": {
            WEEKDAYS[d]: dict(zip(PARTS, cells, strict=True)) for d, cells in enumerate(grid)
        },
    }
