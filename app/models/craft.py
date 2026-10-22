"""Craft notes: what you've learned about doing stand-up, kept apart from your material."""

import uuid

from sqlalchemy import JSON, CheckConstraint, ForeignKey, Index, Integer, String, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, OwnedMixin
from app.models.trash import Trashable

# How a kind of note behaves: a checklist ticks, a technique runs, a path climbs, a note reads.
BEHAVIOURS = ("checklist", "technique", "reference", "path")
# Screens that can show an area's notes in a sheet.
CRAFT_SCREENS = ("rewrite", "sets", "stage")


def one_of(column: str, values: tuple[str, ...]) -> str:
    """SQL for 'column is one of these values'."""
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


class CraftArea(OwnedMixin, Base):
    """A folder of craft notes, yours to add, rename, colour, reorder and delete.

    `screens` lists the screens that show its notes (Rewrite, the set builder, Stage).
    """

    __tablename__ = "craft_areas"
    __table_args__ = (
        Index("uq_craft_areas_user_name", "user_id", text("lower(name)"), unique=True),
    )

    name: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(String(200), default="")
    color: Mapped[str] = mapped_column(String(20), default="sky")
    screens: Mapped[list[str]] = mapped_column(JSON, default=list)
    position: Mapped[int] = mapped_column(Integer, default=0)


class NoteKind(OwnedMixin, Base):
    """A kind of craft note, yours to name, add and delete. Its behaviour is how the app uses it."""

    __tablename__ = "craft_kinds"
    __table_args__ = (
        Index("uq_craft_kinds_user_name", "user_id", text("lower(name)"), unique=True),
        CheckConstraint(one_of("behaviour", BEHAVIOURS), name="behaviour_values"),
    )

    name: Mapped[str] = mapped_column(String(60))
    behaviour: Mapped[str] = mapped_column(String(20), default="reference")
    position: Mapped[int] = mapped_column(Integer, default=0)


class CraftNote(Trashable, OwnedMixin, Base):
    """One lesson, checklist, technique or goal. The body is plain text with light formatting."""

    __tablename__ = "craft_notes"

    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, default="")
    kind_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("craft_kinds.id"), index=True)
    area_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("craft_areas.id"), index=True)
    hashtags: Mapped[list[str]] = mapped_column(JSON, default=list)
    source: Mapped[str] = mapped_column(String(200), default="")
    url: Mapped[str] = mapped_column(String(500), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)
    # Where the lesson came from, if it was learned at a show or from an analysis.
    performance_log_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("performance_logs.id", ondelete="SET NULL"), index=True
    )
    analysis_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("analyses.id", ondelete="SET NULL"), index=True
    )

    kind: Mapped[NoteKind] = relationship(lazy="joined")

    @property
    def behaviour(self) -> str:
        """How the app treats this note, from its kind."""
        return self.kind.behaviour
