"""Venues, setlists and performance logs."""

import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    Uuid,
    false,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, OwnedMixin, UTCDateTime
from app.models.library import Topic
from app.models.trash import Trashable


class Venue(OwnedMixin, Base):
    __tablename__ = "venues"
    __table_args__ = (Index("uq_venues_user_name", "user_id", text("lower(name)"), unique=True),)

    name: Mapped[str] = mapped_column(String(160))


class SetTag(OwnedMixin, Base):
    """A label you give sets (In progress, Weak, Opener set...). Yours to add, rename and delete."""

    __tablename__ = "set_tags"
    __table_args__ = (Index("uq_set_tags_user_name", "user_id", text("lower(name)"), unique=True),)

    name: Mapped[str] = mapped_column(String(120))
    position: Mapped[int] = mapped_column(Integer, default=0)


setlist_tag_links = Table(
    "setlist_tag_links",
    Base.metadata,
    Column("setlist_id", Uuid, ForeignKey("setlists.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Uuid, ForeignKey("set_tags.id", ondelete="CASCADE"), primary_key=True),
)


class Setlist(OwnedMixin, Base):
    __tablename__ = "setlists"
    __table_args__ = (CheckConstraint("rating BETWEEN 1 AND 5", name="rating_range"),)

    name: Mapped[str] = mapped_column(String(200), default="Untitled Setlist")
    show_date: Mapped[date | None] = mapped_column(Date)
    target_seconds: Mapped[int] = mapped_column(Integer, default=900)
    # How the set feels to you, 1-5 stars; None until you rate it.
    rating: Mapped[int | None] = mapped_column(Integer)
    venue_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("venues.id", ondelete="SET NULL")
    )
    venue: Mapped[Venue | None] = relationship()
    items: Mapped[list["SetlistItem"]] = relationship(
        cascade="all, delete-orphan", order_by="SetlistItem.position"
    )
    tags: Mapped[list[SetTag]] = relationship(secondary=setlist_tag_links, order_by=SetTag.position)


class SetlistItem(IdMixin, Base):
    """One joke in a set. Opener and closer are simply the first and last positions."""

    __tablename__ = "setlist_items"

    setlist_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("setlists.id", ondelete="CASCADE"), index=True
    )
    joke_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("jokes.id", ondelete="CASCADE"))
    position: Mapped[int] = mapped_column(Integer)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    # Optional: a joke to cut if time is short. It doesn't count towards the slot.
    optional: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())


performance_log_topics = Table(
    "performance_log_topics",
    Base.metadata,
    Column("log_id", Uuid, ForeignKey("performance_logs.id", ondelete="CASCADE"), primary_key=True),
    Column("topic_id", Uuid, ForeignKey("topics.id", ondelete="CASCADE"), primary_key=True),
)


class PerformanceLog(Trashable, OwnedMixin, Base):
    """One open mic or show, logged afterwards."""

    __tablename__ = "performance_logs"
    __table_args__ = (CheckConstraint("rating BETWEEN 1 AND 5", name="rating_range"),)

    venue_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("venues.id", ondelete="SET NULL")
    )
    performed_at: Mapped[datetime] = mapped_column(UTCDateTime())
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    audience_size: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[int] = mapped_column(Integer, default=3)
    notes: Mapped[str] = mapped_column(Text, default="")
    # Laugh tally for LPM: how many laughs scored 1, 2, 3, 4 and 5 points. None if not counted.
    laughs: Mapped[list[int] | None] = mapped_column(JSON)
    venue: Mapped[Venue | None] = relationship()
    topics: Mapped[list[Topic]] = relationship(secondary=performance_log_topics)
