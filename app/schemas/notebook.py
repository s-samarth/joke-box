"""Request and response shapes for observations, their topics and brainstorm sessions."""

import uuid
from datetime import datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.legacy import JOKE_IDS
from app.schemas.limits import INT_MAX


class ObservationIn(BaseModel):
    """An observation as the app sends it. A field left out keeps what's stored.

    Apps from before kinds send `topic_id` meaning the kind, and no `kind_id`: the router reads
    such a save the old way (see `legacy_save`), so a save queued offline months ago still lands.
    """

    text: str
    # Left out (an app from before Notes), what's stored stays.
    extra_notes: str | None = Field(default=None, max_length=20_000)
    kind_id: uuid.UUID | None = None
    topic_id: uuid.UUID | None = None
    # Kept only when the observation is created: an import can keep the original date.
    created_at: datetime | None = None
    # The version this edit started from. Omitted (a new one, an older app), nothing is checked.
    base_version: int | None = Field(default=None, le=INT_MAX)

    @field_validator("text")
    @classmethod
    def text_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("An observation needs some words")
        return value


class ObservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    text: str
    extra_notes: str
    kind_id: uuid.UUID | None
    topic_id: uuid.UUID | None
    premise_ids: list[uuid.UUID]
    joke_ids: list[uuid.UUID]
    version: int
    created_at: datetime
    updated_at: datetime


# A session is saved in one request and Vercel caps request bodies at 4.5 MB. Large saves are
# sent gzip-packed (app/packed.py), which fits about 17 pages of dense handwriting.
MAX_INK_PAGES = 20


class Stroke(BaseModel):
    """One pen stroke. Points are [x, y, pressure] on a page 1000 units wide."""

    color: str = Field(max_length=20)
    size: float = Field(gt=0, le=60)
    page: int = Field(default=0, ge=0, lt=MAX_INK_PAGES)
    points: list[tuple[float, float, float]] = Field(max_length=5000)


class WritingSessionFields(BaseModel):
    """What a session holds, as the app sends it and gets it back."""

    title: str = Field(default="", max_length=200)
    content: str = ""
    ink: list[Stroke] = Field(default_factory=list, max_length=10000)
    ink_pages: int = Field(default=1, ge=1, le=MAX_INK_PAGES)
    timer_seconds: int = Field(default=0, ge=0, le=INT_MAX)
    joke_ids: list[uuid.UUID] = Field(
        default_factory=list, max_length=200, validation_alias=JOKE_IDS
    )
    observation_ids: list[uuid.UUID] = Field(default_factory=list, max_length=200)
    technique_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def pages_cover_ink(self) -> Self:
        """There are always enough pages for every stroke, even if a client sent too few."""
        self.ink_pages = max([self.ink_pages, *(s.page + 1 for s in self.ink)])
        return self


class WritingSessionIn(WritingSessionFields):
    # The version this edit started from. Omitted (a new session, an older app), not checked.
    base_version: int | None = Field(default=None, le=INT_MAX)


class WritingSessionOut(WritingSessionFields):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    version: int
    created_at: datetime
    updated_at: datetime


class WritingSessionSummary(BaseModel):
    """A session without its handwriting: for the list, and the answer to a save. A session's
    ink is fetched on its own (GET /api/sessions/{id}), so the list stays small however much
    you've drawn."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    content: str
    ink_pages: int
    # How many strokes there are, kept beside the ink so the list never has to load it.
    ink_strokes: int
    timer_seconds: int
    joke_ids: list[uuid.UUID]
    observation_ids: list[uuid.UUID]
    technique_id: uuid.UUID | None
    version: int
    created_at: datetime
    updated_at: datetime
