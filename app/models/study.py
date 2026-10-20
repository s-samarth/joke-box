"""Studying other comics: a watchlist of routines and written analyses of sets and bits."""

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, OwnedMixin


class WatchItem(OwnedMixin, Base):
    """One routine to watch. The three scores come from the Relatable Schemer dossier (0-10)."""

    __tablename__ = "watch_items"

    title: Mapped[str] = mapped_column(String(200))
    comedian: Mapped[str] = mapped_column(String(120), default="")
    category: Mapped[str] = mapped_column(String(120), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    url: Mapped[str] = mapped_column(String(500), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)
    schemer_index: Mapped[int | None] = mapped_column(Integer)
    logic_density: Mapped[int | None] = mapped_column(Integer)
    dark_pragmatism: Mapped[int | None] = mapped_column(Integer)
    watched: Mapped[bool] = mapped_column(Boolean, default=False)


class Analysis(OwnedMixin, Base):
    """Your write-up of a set or an online bit. Optionally tied to a watchlist routine."""

    __tablename__ = "analyses"

    title: Mapped[str] = mapped_column(String(200))
    url: Mapped[str] = mapped_column(String(500), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    watch_item_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("watch_items.id", ondelete="SET NULL"), index=True
    )
