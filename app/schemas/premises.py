"""Premises: the idea under a group of jokes."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.limits import INT_MAX

PremiseStatus = Literal["Draft", "Work in Progress", "Stage Ready", "Discarded"]
# What Work in Progress was called until November 2026; an older app may still send it.
OLD_NAMES = {"testing": "Work in Progress"}


class PremiseIn(BaseModel):
    created_at: datetime | None = None
    topic_id: uuid.UUID
    take: str = Field(min_length=1, max_length=2000)
    notes: str = Field(default="", max_length=20_000)
    # Left out (an app from before Notes), what's stored stays.
    extra_notes: str | None = Field(default=None, max_length=20_000)
    # 1 to 5, or null for not rated. Left out (an app from before strength), what's stored stays.
    strength: int | None = Field(default=None, ge=1, le=5)
    # Left out (an older app), what's stored stays; a new premise starts as a Draft.
    status: PremiseStatus | None = None
    # Its vibe: an option id from the persona field, or null for Not sure. Left out, kept.
    persona: str | None = Field(default=None, max_length=64)
    # Generic or not; null is not answered yet. Left out, kept.
    generic: bool | None = None
    # The version this edit started from. Omitted (a new one, an older app), nothing is checked.
    base_version: int | None = Field(default=None, le=INT_MAX)

    @field_validator("status", mode="before")
    @classmethod
    def old_status_name(cls, value: object) -> object:
        """A queued save from an older app may still say Testing."""
        return OLD_NAMES.get(value.strip().lower(), value) if isinstance(value, str) else value

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
    persona: str | None
    generic: bool | None
    version: int
    created_at: datetime
    updated_at: datetime
