"""Creative Studio: timed brainstorm sessions on a bit, with saved versions."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, IdMixin, OwnedMixin, utcnow


class Brainstorm(OwnedMixin, Base):
    __tablename__ = "brainstorms"

    bit_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("bits.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200), default="")
    content: Mapped[str] = mapped_column(Text, default="")
    timer_seconds: Mapped[int] = mapped_column(Integer, default=0)
    versions: Mapped[list["BrainstormVersion"]] = relationship(
        cascade="all, delete-orphan", order_by="BrainstormVersion.saved_at"
    )


class BrainstormVersion(IdMixin, Base):
    """A snapshot appended on every save."""

    __tablename__ = "brainstorm_versions"

    brainstorm_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("brainstorms.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200), default="")
    content: Mapped[str] = mapped_column(Text, default="")
    saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
