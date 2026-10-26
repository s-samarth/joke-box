"""Request and response shapes for the watchlist and analyses."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


def web_link(value: str) -> str:
    """Links open from the app, so only http(s) is allowed (no javascript: or data: URLs)."""
    value = value.strip()
    if value and not value.lower().startswith(("http://", "https://")):
        raise ValueError("Links must start with http:// or https://")
    return value


def not_blank(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("A name is needed")
    return value


Score = int | None


class WatchItemIn(BaseModel):
    title: str = Field(max_length=200)
    comedian: str = Field(default="", max_length=120)
    category: str = Field(default="", max_length=120)
    description: str = Field(default="", max_length=2000)
    url: str = Field(default="", max_length=500)
    position: int = Field(default=0, ge=0)
    contrast: Score = Field(default=None, ge=0, le=10)
    logic_density: Score = Field(default=None, ge=0, le=10)
    has_a_point: Score = Field(default=None, ge=0, le=10)
    watched: bool = False

    _title = field_validator("title")(not_blank)
    _url = field_validator("url")(web_link)


class WatchItemOut(WatchItemIn):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class AnalysisIn(BaseModel):
    title: str = Field(max_length=200)
    url: str = Field(default="", max_length=500)
    body: str = ""
    watch_item_id: uuid.UUID | None = None

    _title = field_validator("title")(not_blank)
    _url = field_validator("url")(web_link)


class AnalysisOut(AnalysisIn):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
