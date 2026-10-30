"""Premises: the idea under a group of jokes."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PremiseIn(BaseModel):
    topic_id: uuid.UUID
    take: str = Field(min_length=1, max_length=2000)
    notes: str = Field(default="", max_length=20_000)

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
    created_at: datetime
    updated_at: datetime
