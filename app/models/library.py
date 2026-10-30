"""Jokes and the things that organise them: topics, subtopics, premises, types and statuses."""

import uuid

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Table,
    Text,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, OwnedMixin
from app.models.trash import Trashable

RANDOM_TOPIC = "Random"


class Topic(OwnedMixin, Base):
    """A folder of jokes. 'Random' is the protected system topic every user has."""

    __tablename__ = "topics"
    __table_args__ = (Index("uq_topics_user_name", "user_id", text("lower(name)"), unique=True),)

    name: Mapped[str] = mapped_column(String(120))
    position: Mapped[int] = mapped_column(Integer, default=0)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    subtopics: Mapped[list["Subtopic"]] = relationship(
        back_populates="topic",
        cascade="all, delete-orphan",
        order_by="(Subtopic.position, Subtopic.name)",
    )


class Subtopic(OwnedMixin, Base):
    __tablename__ = "subtopics"
    __table_args__ = (
        Index("uq_subtopics_topic_name", "topic_id", text("lower(name)"), unique=True),
    )

    topic_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("topics.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    position: Mapped[int] = mapped_column(Integer, default=0)
    topic: Mapped[Topic] = relationship(back_populates="subtopics")


class Premise(OwnedMixin, Base):
    """The idea under a group of jokes: your take, and why it's true. Filed under a topic, but a
    joke from any topic can rest on it."""

    __tablename__ = "premises"

    topic_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("topics.id", ondelete="CASCADE"), index=True
    )
    take: Mapped[str] = mapped_column(Text)
    # The reasoning behind the take: why it's true, and anything else worth keeping.
    notes: Mapped[str] = mapped_column(Text, default="")
    position: Mapped[int] = mapped_column(Integer, default=0)


joke_type_links = Table(
    "joke_type_links",
    Base.metadata,
    Column("joke_id", Uuid, ForeignKey("jokes.id", ondelete="CASCADE"), primary_key=True),
    Column("type_id", Uuid, ForeignKey("joke_types.id", ondelete="CASCADE"), primary_key=True),
)


class JokeType(OwnedMixin, Base):
    """A form of joke (One-Liner, Story...). Exists only while at least one joke uses it."""

    __tablename__ = "joke_types"
    __table_args__ = (
        Index("uq_joke_types_user_name", "user_id", text("lower(name)"), unique=True),
    )

    name: Mapped[str] = mapped_column(String(80))


class TypeColor(OwnedMixin, Base):
    """The colour of a type's dot, kept by name so it outlives the type being pruned."""

    __tablename__ = "type_colors"
    __table_args__ = (
        Index("uq_type_colors_user_name", "user_id", text("lower(name)"), unique=True),
    )

    name: Mapped[str] = mapped_column(String(80))
    color: Mapped[str] = mapped_column(String(7))


class Status(OwnedMixin, Base):
    __tablename__ = "statuses"
    __table_args__ = (Index("uq_statuses_user_name", "user_id", text("lower(name)"), unique=True),)

    name: Mapped[str] = mapped_column(String(80))
    position: Mapped[int] = mapped_column(Integer, default=0)


class Joke(Trashable, OwnedMixin, Base):
    """The atomic unit of material: a setup, a punchline and its metadata."""

    __tablename__ = "jokes"
    __table_args__ = (
        CheckConstraint("strength BETWEEN 1 AND 5", name="strength_range"),
        CheckConstraint(
            "clean_rating IS NULL OR clean_rating IN ('clean', 'mild', 'dirty')",
            name="clean_rating_values",
        ),
    )

    topic_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("topics.id"), index=True)
    subtopic_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("subtopics.id", ondelete="SET NULL")
    )
    status_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("statuses.id", ondelete="SET NULL")
    )
    # The premise this joke rests on, from any topic. Deleting the premise keeps the joke.
    premise_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("premises.id", ondelete="SET NULL"), index=True
    )
    setup: Mapped[str] = mapped_column(Text)
    punchline: Mapped[str] = mapped_column(Text, default="")
    strength: Mapped[int] = mapped_column(SmallInteger, default=3)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)
    hashtags: Mapped[list[str]] = mapped_column(JSON, default=list)
    # Comedy tags: extra punchlines that follow the main punch.
    tag_lines: Mapped[list[str]] = mapped_column(JSON, default=list)
    clean_rating: Mapped[str | None] = mapped_column(String(10))
    language: Mapped[str | None] = mapped_column(String(40))
    comments: Mapped[str] = mapped_column(Text, default="")
    # The joke this one continues from. Many jokes can follow one, so chains branch into trees.
    follows_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("jokes.id", ondelete="SET NULL"), index=True
    )
    # Goes up by one on every save; a save edited from an older version is a conflict.
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")

    types: Mapped[list[JokeType]] = relationship(secondary=joke_type_links, order_by=JokeType.name)
    status: Mapped[Status | None] = relationship()
