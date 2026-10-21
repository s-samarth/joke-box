"""Request and response shapes for craft notes."""

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.study import not_blank, web_link

CraftKind = Literal["checklist", "technique", "reference", "path"]
CraftScreen = Literal["rewrite", "sets", "stage"]
AreaColor = Literal["sky", "violet", "emerald", "orange", "rose", "pink", "amber", "teal"]


class CraftAreaIn(BaseModel):
    name: str = Field(max_length=80)
    description: str = Field(default="", max_length=200)
    color: AreaColor = "sky"
    screens: list[CraftScreen] = Field(default_factory=list)

    _name = field_validator("name")(not_blank)

    @field_validator("screens")
    @classmethod
    def no_repeats(cls, values: list[CraftScreen]) -> list[CraftScreen]:
        return list(dict.fromkeys(values))


class CraftAreaOut(CraftAreaIn):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    position: int


class AreaOrderIn(BaseModel):
    ids: list[uuid.UUID] = Field(max_length=200)


class CraftNoteIn(BaseModel):
    title: str = Field(max_length=200)
    body: str = ""
    kind: CraftKind = "reference"
    area_id: uuid.UUID
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
