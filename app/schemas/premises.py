"""Premises: the idea under a group of jokes."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.limits import INT_MAX

PremiseStatus = Literal["Draft", "Testing", "Stage Ready", "Discarded"]


class PremiseIn(BaseModel):
    topic_id: uuid.UUID
    take: str = Field(min_length=1, max_length=2000)
    notes: str = Field(default="", max_length=20_000)
    # Left out (an app from before Notes), what's stored stays.
    extra_notes: str | None = Field(default=None, max_length=20_000)
    # 1 to 5, or null for not rated. Left out (an app from before strength), what's stored stays.
    strength: int | None = Field(default=None, ge=1, le=5)
    # Left out (an older app), what's stored stays; a new premise starts as a Draft.
    status: PremiseStatus | None = None
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
    strength: int | None
    status: str
    version: int
    created_at: datetime
    updated_at: datetime
