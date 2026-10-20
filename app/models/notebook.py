"""Observations: things you noticed, logged on their own, not yet jokes.

They have their own topics, kept apart from joke topics so the joke folders stay clean.
"""

import uuid

from sqlalchemy import ForeignKey, Index, String, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, OwnedMixin


class ObservationTopic(OwnedMixin, Base):
    __tablename__ = "observation_topics"
    __table_args__ = (
        Index("uq_observation_topics_user_name", "user_id", text("lower(name)"), unique=True),
    )

    name: Mapped[str] = mapped_column(String(120))


class Observation(OwnedMixin, Base):
    """One thing you noticed. Its topic is optional; deleting the topic keeps the observation."""

    __tablename__ = "observations"

    text: Mapped[str] = mapped_column(Text)
    topic_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("observation_topics.id", ondelete="SET NULL"), index=True
    )
