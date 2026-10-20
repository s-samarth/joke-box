"""Request and response shapes for observations, their topics and brainstorm sessions."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ObservationIn(BaseModel):
    text: str
    topic_id: uuid.UUID | None = None

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


class Stroke(BaseModel):
    """One pen stroke. Points are [x, y, pressure] on a page 1000 units wide."""

    color: str = Field(max_length=20)
    size: float = Field(gt=0, le=60)
    points: list[tuple[float, float, float]] = Field(max_length=5000)


class WritingSessionIn(BaseModel):
    title: str = Field(default="", max_length=200)
    content: str = ""
    ink: list[Stroke] = Field(default_factory=list, max_length=4000)
    timer_seconds: int = Field(default=0, ge=0)
    bit_ids: list[uuid.UUID] = Field(default_factory=list, max_length=200)
    observation_ids: list[uuid.UUID] = Field(default_factory=list, max_length=200)


class WritingSessionOut(WritingSessionIn):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
