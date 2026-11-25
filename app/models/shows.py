"""Venues, setlists and performance logs."""

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

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
    UniqueConstraint,
    Uuid,
    false,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, OwnedMixin, UTCDateTime
from app.models.library import Topic
from app.models.trash import Trashable

if TYPE_CHECKING:
    from app.models.reviews import ShowReview


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


class Setlist(Trashable, OwnedMixin, Base):
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
    # Goes up by one on every save; a save edited from an older version is a conflict.
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    # The one point the set makes tonight, in a sentence (docs/sets.md).
    point: Mapped[str] = mapped_column(Text, default="", server_default="")
    # The set's beats in running order, as JSON in the shape of schemas/set_beats.py BeatIn.
    # None for a set saved before beats (0045): it reads as one beat holding `items`. `items`
    # stays, worked out from the beats on every save, for what lists a joke's sets.
    beats: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON)


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
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    __table_args__ = (CheckConstraint("rating BETWEEN 1 AND 5", name="rating_range"),)

    venue_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("venues.id", ondelete="SET NULL")
    )
    performed_at: Mapped[datetime] = mapped_column(UTCDateTime())
    # No longer used (20 Nov 2026): topics say what a show was. Every save clears it; the
    # column stays because migrations only add, and can be dropped once nothing deploys it.
    title: Mapped[str] = mapped_column(String(200), default="", server_default="")
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    audience_size: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[int] = mapped_column(Integer, default=3)
    notes: Mapped[str] = mapped_column(Text, default="")
    # What you learned at the show: a comment on the show, like the remarks in `notes`. Craft is
    # for general lessons, so show lessons stay here (moved out of Craft in 0039).
    learned: Mapped[str] = mapped_column(Text, default="", server_default="")
    # Laugh tally for LPM: how many laughs scored 1, 2, 3, 4 and 5 points. None if not counted.
    laughs: Mapped[list[int] | None] = mapped_column(JSON)
    venue: Mapped[Venue | None] = relationship()
    topics: Mapped[list[Topic]] = relationship(secondary=performance_log_topics)
    jokes: Mapped[list["PerformanceJoke"]] = relationship(
        cascade="all, delete-orphan", order_by="PerformanceJoke.position"
    )
    # What the set-review engine heard in the recording, if the show was logged from one.
    review: Mapped["ShowReview | None"] = relationship(cascade="all, delete-orphan")


# How a joke went at a show. None: done, not rated.
RESULTS = ("bombed", "ok", "killed")


class PerformanceJoke(IdMixin, Base):
    """One joke done at a show, in running order, and how it went. Owned through its show."""

    __tablename__ = "performance_jokes"
    __table_args__ = (
        UniqueConstraint("log_id", "joke_id"),
        CheckConstraint("result IN ('bombed', 'ok', 'killed')", name="result_kind"),
        CheckConstraint(
            "suggested_result IN ('bombed', 'ok', 'killed')", name="suggested_result_kind"
        ),
    )

    log_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("performance_logs.id", ondelete="CASCADE"), index=True
    )
    joke_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("jokes.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    result: Mapped[str | None] = mapped_column(String(10))
    # What the set-review engine suggested from the laughs, kept beside the comic's own result:
    # the gap between the two is what the engine is tuned on. None when there was no review.
    suggested_result: Mapped[str | None] = mapped_column(String(10))
    # A comment on how this joke went on the night.
    note: Mapped[str] = mapped_column(Text, default="", server_default="")
