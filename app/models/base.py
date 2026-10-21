"""Declarative base and the columns every table shares."""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, Dialect, ForeignKey, MetaData, TypeDecorator, Uuid
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Stable constraint names so Alembic migrations work the same on SQLite and Postgres.
NAMING = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


def utcnow() -> datetime:
    """Timezone-aware 'now', used for every timestamp column."""
    return datetime.now(UTC)


class UTCDateTime(TypeDecorator[datetime]):
    """A timestamp stored in UTC and always read back with its timezone.

    Postgres keeps the zone itself. SQLite (local development) can't: it would store the wall time
    of whatever zone came in and hand back a naive time, which the browser then reads as its own
    local time. So every time is converted to UTC on the way in and tagged UTC on the way out, on
    every database. The app shows all times in IST.
    """

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        return value.astimezone(UTC) if value.tzinfo else value.replace(tzinfo=UTC)

    def process_result_value(self, value: datetime | None, dialect: Dialect) -> datetime | None:
        if value is None:
            return None
        return value.astimezone(UTC) if value.tzinfo else value.replace(tzinfo=UTC)


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING)


class IdMixin:
    """UUID primary key. Clients may generate it, which makes offline saves safe to retry."""

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow)


class OwnedMixin(IdMixin, TimestampMixin):
    """Every user-owned row carries user_id; every query filters by it."""

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
