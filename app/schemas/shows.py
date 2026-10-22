"""Request and response shapes for venues, setlists, performance logs and brainstorms."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class VenueOut(BaseModel):
    id: uuid.UUID
    name: str
    # How many shows and sets use the venue, so the app can say what deleting it would move.
    shows: int = 0
    sets: int = 0


class SetlistItemIn(BaseModel):
    bit_id: uuid.UUID
    duration_seconds: int = Field(default=0, ge=0)
    optional: bool = False


class SetlistIn(BaseModel):
    name: str = Field(default="Untitled Setlist", min_length=1, max_length=200)
    show_date: date | None = None
    target_seconds: int = Field(default=900, ge=0)
    venue_name: str | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    tag_ids: list[uuid.UUID] = Field(default_factory=list)
    items: list[SetlistItemIn] = Field(default_factory=list)


class SetlistItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bit_id: uuid.UUID
    position: int
    duration_seconds: int
    optional: bool


class SetlistOut(BaseModel):
    id: uuid.UUID
    name: str
    show_date: date | None
    target_seconds: int
    venue_name: str | None
    rating: int | None
    tag_ids: list[uuid.UUID]
    items: list[SetlistItemOut]
    created_at: datetime
    updated_at: datetime


class LogIn(BaseModel):
    venue_name: str = Field(default="Unidentified Venue", min_length=1, max_length=160)
    performed_at: datetime
    duration_seconds: int = Field(default=0, ge=0)
    audience_size: int = Field(default=0, ge=0)
    rating: int = Field(default=3, ge=1, le=5)
    topic_ids: list[uuid.UUID] = Field(default_factory=list)
    notes: str = ""
    laughs: list[int] | None = None

    @field_validator("laughs")
    @classmethod
    def five_counts(cls, value: list[int] | None) -> list[int] | None:
        """One count per laugh score, 1 to 5 points, none negative."""
        if value is not None and (len(value) != 5 or any(n < 0 for n in value)):
            raise ValueError("Laughs are five counts, one per score from 1 to 5")
        return value


class LogOut(BaseModel):
    id: uuid.UUID
    venue_name: str
    performed_at: datetime
    duration_seconds: int
    audience_size: int
    rating: int
    topic_ids: list[uuid.UUID]
    notes: str
    laughs: list[int] | None
    created_at: datetime


class BrainstormIn(BaseModel):
    bit_id: uuid.UUID
    title: str = Field(default="", max_length=200)
    content: str = ""
    timer_seconds: int = Field(default=0, ge=0)


class BrainstormVersionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    content: str
    saved_at: datetime


class BrainstormOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    bit_id: uuid.UUID
    title: str
    content: str
    timer_seconds: int
    versions: list[BrainstormVersionOut]
    created_at: datetime
    updated_at: datetime


class MeOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
    avatar_url: str
    plan: str
    env: str
