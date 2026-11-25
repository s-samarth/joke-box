"""Your label fields for set beats (Status, Dominant persona side, Tone, Voice fit, or your own)."""

import uuid
from typing import Any

from sqlalchemy import JSON, ForeignKey, Integer, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin


class SetFieldConfig(IdMixin, Base):
    """One row per comic: the fields every beat can be labelled with, and the top-up limit the
    status check uses. No row yet means the defaults in services/set_fields.py."""

    __tablename__ = "set_field_configs"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    # A list in the shape of schemas/set_beats.py SetFieldIn.
    fields: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    # The longest stretch with no humility top-up before the check warns ("every 2-4 minutes").
    top_up_seconds: Mapped[int] = mapped_column(Integer, default=240, server_default="240")
