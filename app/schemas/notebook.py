"""Request and response shapes for observations and their topics."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


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
