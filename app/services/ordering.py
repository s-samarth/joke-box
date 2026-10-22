"""Lists you put in your own order: topics, subtopics and observation topics."""

import uuid
from collections.abc import Sequence
from typing import Protocol

from sqlalchemy import func, select
from sqlalchemy.orm import InstrumentedAttribute, Session
from sqlalchemy.sql import ColumnElement


class Ordered(Protocol):
    """A row with a place in a list you arrange yourself."""

    id: uuid.UUID
    name: str
    position: int


def set_order(rows: Sequence[Ordered], ids: Sequence[uuid.UUID]) -> None:
    """Number `rows` in the order of `ids`.

    Ids that aren't among the rows (someone else's, or deleted meanwhile) are skipped. Rows the
    ids leave out (added on another device since the list was loaded) keep their order, after.
    """
    by_id = {row.id: row for row in rows}
    placed = [by_id[i] for i in dict.fromkeys(ids) if i in by_id]
    rest = sorted(
        (row for row in rows if row not in placed), key=lambda r: (r.position, r.name.lower())
    )
    for position, row in enumerate(placed + rest):
        row.position = position


def next_position(
    db: Session, column: InstrumentedAttribute[int], *where: ColumnElement[bool]
) -> int:
    """One past the last place in a list, so something new goes at the end."""
    last = db.scalar(select(func.max(column)).where(*where))
    return 0 if last is None else last + 1
