"""The Trash: deleting most things moves them here for 30 days instead of erasing them.

A trashed row keeps its place in the database with `deleted_at` set, so restoring it puts it
back exactly as it was, links and all. Every ORM query hides trashed rows automatically, so no
list, count or lookup has to remember to; the Trash itself asks for them with
`include_trashed`. Bulk updates (moving jokes off a deleted topic) still reach trashed rows,
which keeps them restorable.
"""

from datetime import datetime

from sqlalchemy import event
from sqlalchemy.orm import Mapped, ORMExecuteState, Session, mapped_column, with_loader_criteria

from app.models.base import UTCDateTime

INCLUDE_TRASHED = "include_trashed"


class Trashable:
    """Rows that go to the Trash when deleted. None means it's not in the Trash."""

    deleted_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), index=True)


@event.listens_for(Session, "do_orm_execute")
def _hide_trashed(state: ORMExecuteState) -> None:
    if state.is_select and not state.execution_options.get(INCLUDE_TRASHED, False):
        state.statement = state.statement.options(
            with_loader_criteria(
                Trashable, lambda cls: cls.deleted_at.is_(None), include_aliases=True
            )
        )
