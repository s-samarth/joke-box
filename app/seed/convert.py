"""Small converters for the old Bit Vault data shape."""

import re
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models import Brainstorm, Joke, PerformanceLog, Setlist, Subtopic, Topic, User, Venue

Json = dict[str, Any]
TAGS_IN_PUNCHLINE = re.compile(r"\s*\btags?\s*:\s*", re.IGNORECASE)


def seconds(text: Any) -> int:
    """'2m 30s' -> 150. Old logs sometimes stored minutes as a number."""
    if isinstance(text, int | float):
        return round(text * 60)
    match = re.match(r"\s*(\d+)m\s*(\d+)s", str(text or ""))
    return int(match[1]) * 60 + int(match[2]) if match else 0


def when(text: str | None) -> datetime:
    value = datetime.fromisoformat(text) if text else datetime.now(UTC)
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def split_tags(punchline: str) -> tuple[str, list[str]]:
    """'Punch. Tags: one / two' -> ('Punch.', ['one / two']); tags on new lines become separate."""
    parts = TAGS_IN_PUNCHLINE.split(punchline, maxsplit=1)
    if len(parts) == 1:
        return punchline, []
    lines = [line.strip(" -•") for line in parts[1].splitlines()]
    return parts[0].strip(), [line for line in lines if line]


def wipe(db: Session, user: User) -> None:
    """Remove every row the user owns, keeping the user."""
    for model in (PerformanceLog, Setlist, Brainstorm, Joke, Venue, Subtopic, Topic):
        db.execute(delete(model).where(model.user_id == user.id))
    db.flush()
