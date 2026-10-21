"""Request and response shapes for craft notes."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.study import not_blank, web_link

CraftKind = Literal["checklist", "technique", "reference", "path"]
CraftArea = Literal["writing", "generating", "rewriting", "sets", "stage", "formats", "progress"]


class CraftNoteIn(BaseModel):
    title: str = Field(max_length=200)
    body: str = ""
    kind: CraftKind = "reference"
    area: CraftArea = "writing"
    hashtags: list[str] = Field(default_factory=list)
    source: str = Field(default="", max_length=200)
    url: str = Field(default="", max_length=500)
    position: int = Field(default=0, ge=0)
    performance_log_id: uuid.UUID | None = None
    analysis_id: uuid.UUID | None = None
    # Honoured only when the note is created, so an import can keep the date it was written.
    created_at: datetime | None = None

    _title = field_validator("title")(not_blank)
    _url = field_validator("url")(web_link)

    @field_validator("hashtags")
    @classmethod
    def drop_blank_tags(cls, values: list[str]) -> list[str]:
        return [v.strip() for v in values if v.strip()]


class CraftNoteOut(CraftNoteIn):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
