"""Venues, setlists and performance logs."""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, OwnedMixin
from app.models.library import Topic


class Venue(OwnedMixin, Base):
    __tablename__ = "venues"
    __table_args__ = (Index("uq_venues_user_name", "user_id", text("lower(name)"), unique=True),)

    name: Mapped[str] = mapped_column(String(160))


class Setlist(OwnedMixin, Base):
    __tablename__ = "setlists"

    name: Mapped[str] = mapped_column(String(200), default="Untitled Setlist")
    show_date: Mapped[date | None] = mapped_column(Date)
    target_seconds: Mapped[int] = mapped_column(Integer, default=900)
    venue_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("venues.id", ondelete="SET NULL")
    )
    venue: Mapped[Venue | None] = relationship()
    items: Mapped[list["SetlistItem"]] = relationship(
        cascade="all, delete-orphan", order_by="SetlistItem.position"
    )


class SetlistItem(IdMixin, Base):
    """One bit in a set. Opener and closer are simply the first and last positions."""

    __tablename__ = "setlist_items"

    setlist_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("setlists.id", ondelete="CASCADE"), index=True
    )
    bit_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("bits.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)


performance_log_topics = Table(
    "performance_log_topics",
    Base.metadata,
    Column("log_id", Uuid, ForeignKey("performance_logs.id", ondelete="CASCADE"), primary_key=True),
    Column("topic_id", Uuid, ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True),
)


class PerformanceLog(OwnedMixin, Base):
    """One open mic or show, logged afterwards."""

    __tablename__ = "performance_logs"
    __table_args__ = (CheckConstraint("rating BETWEEN 1 AND 5", name="rating_range"),)

    venue_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("venues.id", ondelete="SET NULL")
    )
    performed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    audience_size: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[int] = mapped_column(Integer, default=3)
    notes: Mapped[str] = mapped_column(Text, default="")
    venue: Mapped[Venue | None] = relationship()
    topics: Mapped[list[Topic]] = relationship(secondary=performance_log_topics)
