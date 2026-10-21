"""Craft notes: what you've learned about doing stand-up, kept apart from your material."""

from sqlalchemy import JSON, CheckConstraint, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, OwnedMixin

# What a note is for. The kind decides how the app shows it (a checklist ticks, a technique runs).
CRAFT_KINDS = ("checklist", "technique", "reference", "path")
# Where in the work it's used. Fixed, so the app can show the right notes on the right screen.
CRAFT_AREAS = ("writing", "generating", "rewriting", "sets", "stage", "formats", "progress")


def one_of(column: str, values: tuple[str, ...]) -> str:
    """SQL for 'column is one of these values'."""
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


class CraftNote(OwnedMixin, Base):
    """One lesson, checklist, technique or goal. The body is plain text with light formatting."""

    __tablename__ = "craft_notes"
    __table_args__ = (
        CheckConstraint(one_of("kind", CRAFT_KINDS), name="kind_values"),
        CheckConstraint(one_of("area", CRAFT_AREAS), name="area_values"),
    )

    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, default="")
    kind: Mapped[str] = mapped_column(String(20), default="reference")
    area: Mapped[str] = mapped_column(String(20), default="writing")
    hashtags: Mapped[list[str]] = mapped_column(JSON, default=list)
    source: Mapped[str] = mapped_column(String(200), default="")
    url: Mapped[str] = mapped_column(String(500), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)
