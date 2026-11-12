"""Premises: the idea under a group of jokes."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.limits import INT_MAX


class PremiseIn(BaseModel):
    topic_id: uuid.UUID
    take: str = Field(min_length=1, max_length=2000)
    notes: str = Field(default="", max_length=20_000)
    # Left out (an app from before Notes), what's stored stays.
    extra_notes: str | None = Field(default=None, max_length=20_000)
    # The version this edit started from. Omitted (a new one, an older app), nothing is checked.
    base_version: int | None = Field(default=None, le=INT_MAX)

    @field_validator("take")
    @classmethod
    def take_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Write the take")
        return value


class PremiseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    topic_id: uuid.UUID
    take: str
    notes: str
    extra_notes: str
    version: int
    created_at: datetime
    updated_at: datetime
