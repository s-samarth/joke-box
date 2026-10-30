"""Request and response shapes for jokes, topics, types and statuses."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

CleanRating = Literal["clean", "mild", "dirty"]


class OrderIn(BaseModel):
    """Ids in the order you arranged them."""

    ids: list[uuid.UUID] = Field(max_length=500)


class NameIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Name cannot be blank")
        return value


class SubtopicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class TopicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    is_system: bool
    subtopics: list[SubtopicOut]


class NamedOut(BaseModel):
    """Types and statuses: just an id and a name."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class TypeOut(NamedOut):
    color: str


class TypeColorIn(NameIn):
    """A type's colour. The type need not exist yet: a new one is coloured before it is saved."""

    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")

    @field_validator("color")
    @classmethod
    def lower_color(cls, value: str) -> str:
        return value.lower()


# A joke always has a status: none, or the retired "Status Unknown", means Draft.
DEFAULT_STATUS = "Draft"
RETIRED_STATUSES = {"status unknown"}


def status_name(name: str | None) -> str:
    """The status a joke is saved with, given the one asked for."""
    name = (name or "").strip()
    return DEFAULT_STATUS if not name or name.lower() in RETIRED_STATUSES else name


class JokeIn(BaseModel):
    """A joke as the editor sends it. Types and status are names, created on the fly."""

    setup: str = Field(min_length=1)
    punchline: str = ""
    topic_id: uuid.UUID
    subtopic_id: uuid.UUID | None = None
    # The premise it rests on, from any topic. Left out (an older app), the link stays as it is.
    premise_id: uuid.UUID | None = None
    types: list[str] = Field(default_factory=list)
    status: str = DEFAULT_STATUS
    strength: int = Field(default=3, ge=1, le=5)
    duration_seconds: int = Field(default=0, ge=0)
    hashtags: list[str] = Field(default_factory=list)
    tag_lines: list[str] = Field(default_factory=list)
    clean_rating: CleanRating | None = None
    language: str | None = None
    comments: str = ""
    # The joke this one follows. Left out (an older app), the link stays as it is.
    follows_id: uuid.UUID | None = None
    created_at: datetime | None = None
    # The version this edit started from. Omitted (a new joke, an import), nothing is checked.
    base_version: int | None = None

    @field_validator("setup")
    @classmethod
    def setup_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Setup is required")
        return value

    @field_validator("status", mode="before")
    @classmethod
    def status_or_draft(cls, value: str | None) -> str:
        return status_name(value)

    @field_validator("types", "hashtags", "tag_lines")
    @classmethod
    def drop_blank_items(cls, values: list[str]) -> list[str]:
        return [v.strip() for v in values if v.strip()]


class JokeOut(BaseModel):
    id: uuid.UUID
    setup: str
    punchline: str
    topic_id: uuid.UUID
    subtopic_id: uuid.UUID | None
    premise_id: uuid.UUID | None
    types: list[str]
    status: str | None
    strength: int
    duration_seconds: int
    hashtags: list[str]
    tag_lines: list[str]
    clean_rating: CleanRating | None
    language: str | None
    comments: str
    follows_id: uuid.UUID | None
    version: int
    created_at: datetime
    updated_at: datetime
