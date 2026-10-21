"""Request and response shapes for observations, their topics and brainstorm sessions."""

import uuid
from datetime import datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ObservationIn(BaseModel):
    text: str
    topic_id: uuid.UUID | None = None
    # Kept only when the observation is created: an import can keep the original date.
    created_at: datetime | None = None

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
    topic_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


# A session is saved in one request and Vercel caps request bodies at 4.5 MB, so the page count
# is capped well below where a session full of dense handwriting would hit that.
MAX_INK_PAGES = 20


class Stroke(BaseModel):
    """One pen stroke. Points are [x, y, pressure] on a page 1000 units wide."""

    color: str = Field(max_length=20)
    size: float = Field(gt=0, le=60)
    page: int = Field(default=0, ge=0, lt=MAX_INK_PAGES)
    points: list[tuple[float, float, float]] = Field(max_length=5000)


class WritingSessionIn(BaseModel):
    title: str = Field(default="", max_length=200)
    content: str = ""
    ink: list[Stroke] = Field(default_factory=list, max_length=10000)
    ink_pages: int = Field(default=1, ge=1, le=MAX_INK_PAGES)
    timer_seconds: int = Field(default=0, ge=0)
    bit_ids: list[uuid.UUID] = Field(default_factory=list, max_length=200)
    observation_ids: list[uuid.UUID] = Field(default_factory=list, max_length=200)

    @model_validator(mode="after")
    def pages_cover_ink(self) -> Self:
        """There are always enough pages for every stroke, even if a client sent too few."""
        self.ink_pages = max([self.ink_pages, *(s.page + 1 for s in self.ink)])
        return self


class WritingSessionOut(WritingSessionIn):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
