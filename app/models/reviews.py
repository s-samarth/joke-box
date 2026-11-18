"""What the set-review engine heard in a show's recording. The recording itself never comes here:
it stays on the comic's computer, and only the laughs found in it are kept."""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import JSON, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, UTCDateTime, utcnow


class ShowReview(IdMixin, Base):
    """One show's laugh timeline, owned through its show (and in the Trash with it)."""

    __tablename__ = "show_reviews"

    log_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("performance_logs.id", ondelete="CASCADE"), unique=True
    )
    # Which version of the engine made it, so a review can be traced after the engine is retuned.
    engine_version: Mapped[str] = mapped_column(String(40))
    # Each laugh or applause break: {"start", "end"} in seconds into the recording, "kind"
    # ("laugh" or "applause"), "points" (1-5) and the "joke_id" it's credited to, or null.
    events: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
