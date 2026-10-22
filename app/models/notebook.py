"""Observations (things you noticed, not yet jokes) and free brainstorm sessions.

They have their own topics, kept apart from joke topics so the joke folders stay clean.
"""

import uuid
from typing import Any

from sqlalchemy import JSON, ForeignKey, Index, Integer, String, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, OwnedMixin
from app.models.trash import Trashable


class ObservationTopic(OwnedMixin, Base):
    __tablename__ = "observation_topics"
    __table_args__ = (
        Index("uq_observation_topics_user_name", "user_id", text("lower(name)"), unique=True),
    )

    name: Mapped[str] = mapped_column(String(120))
    position: Mapped[int] = mapped_column(Integer, default=0)


class Observation(Trashable, OwnedMixin, Base):
    """One thing you noticed. Its topic is optional; deleting the topic keeps the observation."""

    __tablename__ = "observations"

    text: Mapped[str] = mapped_column(Text)
    topic_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("observation_topics.id", ondelete="SET NULL"), index=True
    )


class WritingSession(Trashable, OwnedMixin, Base):
    """A free brainstorm, not tied to one joke: typed text, handwriting, a timer and links.

    Handwriting is kept as pen strokes (points), not an image, so it stays sharp at any size
    and stays small. Each stroke records which page it is on; `ink_pages` counts the pages so
    a blank page you added is still there next time. Links are id lists: a linked joke or
    observation that was later deleted simply drops out when the page is shown, rather than
    blocking the delete.
    """

    __tablename__ = "writing_sessions"

    title: Mapped[str] = mapped_column(String(200), default="")
    content: Mapped[str] = mapped_column(Text, default="")
    ink: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    ink_pages: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    timer_seconds: Mapped[int] = mapped_column(Integer, default=0)
    bit_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    observation_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    # The craft technique the session runs, if any (Ranting HWSS, joke webs...).
    technique_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("craft_notes.id", ondelete="SET NULL")
    )
