"""Small helpers that keep tool results short and searchable."""

from collections.abc import Iterable
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

LIMIT = 25
IST = ZoneInfo("Asia/Kolkata")


def clip(text: str | None, limit: int) -> str:
    """Text cut to `limit` characters, marked when something was left out."""
    text = (text or "").strip()
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def matches(query: str, *fields: str | None) -> bool:
    """True when every word of the query appears somewhere in the fields (any case)."""
    haystack = " ".join(f or "" for f in fields).lower()
    return all(word in haystack for word in query.lower().split())


def same_name(wanted: str, name: str | None) -> bool:
    """A name filter: empty matches everything, otherwise the name must match in any case."""
    return not wanted.strip() or wanted.strip().lower() == (name or "").strip().lower()


def ist_date(moment: datetime | None) -> str | None:
    """A timestamp as the IST date the app shows, e.g. 2026-10-31."""
    return moment.astimezone(IST).date().isoformat() if moment else None


def page[T](rows: list[T], limit: int) -> tuple[list[T], int]:
    """The first `limit` rows (capped at LIMIT) and how many there were in all."""
    return rows[: max(1, min(limit, LIMIT))], len(rows)


def by_id(rows: Iterable[Any]) -> dict[Any, str]:
    """(id, name) rows as a lookup."""
    return {row_id: name for row_id, name in rows}
