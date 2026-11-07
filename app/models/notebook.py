"""Observations (things you noticed, not yet jokes) and free brainstorm sessions.

An observation has a topic, from the same list as jokes and premises, and a kind: what sort of
note it is (an idea for a set, a craft thought, a question). Plain observations have no kind.
"""

import uuid
from typing import Any

from sqlalchemy import JSON, ForeignKey, Index, Integer, String, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, OwnedMixin
from app.models.trash import Trashable


class ObservationTopic(OwnedMixin, Base):
    """A kind of observation, like "Set ideas" or "Questions". The table keeps its first name,
    from when these were the observations' only topics (see Observation)."""

    __tablename__ = "observation_topics"
    __table_args__ = (
        Index("uq_observation_topics_user_name", "user_id", text("lower(name)"), unique=True),
    )

    name: Mapped[str] = mapped_column(String(120))
    position: Mapped[int] = mapped_column(Integer, default=0)


class Observation(Trashable, OwnedMixin, Base):
    """One thing you noticed, with an optional topic and kind.

    The columns keep the names they had before kinds: `topic_id` holds the kind and
    `joke_topic_id` the topic. Renaming them would break the deployment still serving while a new
    one migrates. Deleting a kind keeps its observations, with no kind; deleting a topic moves
    them to Random, like its jokes.
    """

    __tablename__ = "observations"

    text: Mapped[str] = mapped_column(Text)
    kind_id: Mapped[uuid.UUID | None] = mapped_column(
        "topic_id", Uuid, ForeignKey("observation_topics.id", ondelete="SET NULL"), index=True
    )
    topic_id: Mapped[uuid.UUID | None] = mapped_column(
        "joke_topic_id", Uuid, ForeignKey("topics.id", ondelete="SET NULL"), index=True
    )
    # What came from it: premises and jokes it was added to or started. Id lists, like a
    # brainstorm's links, so deleting one never waits on this; a deleted one drops out of view.
    premise_ids: Mapped[list[str]] = mapped_column(JSON, default=list, server_default="[]")
    joke_ids: Mapped[list[str]] = mapped_column(JSON, default=list, server_default="[]")
    # Goes up by one on every save; a save edited from an older version is a conflict.
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")


class WritingSession(Trashable, OwnedMixin, Base):
    """A free brainstorm, not tied to one joke: typed text, handwriting, a timer and links.

    Handwriting is kept as pen strokes (points), not an image, so it stays sharp at any size
    and stays small. Each stroke records which page it is on; `ink_pages` counts the pages so
    a blank page you added is still there next time. Links are id lists: a linked joke or
    observation that was later deleted simply drops out when the page is shown, rather than
    blocking the delete.

    The ink is deferred: it's loaded only when read, so lists and saves don't carry every
    stroke of every session out of the database. `ink_strokes` counts the strokes for them.
    """

    __tablename__ = "writing_sessions"

    title: Mapped[str] = mapped_column(String(200), default="")
    content: Mapped[str] = mapped_column(Text, default="")
    ink: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, deferred=True)
    ink_strokes: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    ink_pages: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    timer_seconds: Mapped[int] = mapped_column(Integer, default=0)
    joke_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    observation_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    # The craft technique the session runs, if any (Ranting HWSS, joke webs...).
    technique_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("craft_notes.id", ondelete="SET NULL")
    )
    # Goes up by one on every save; a save edited from an older version is kept as a copy.
    version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
