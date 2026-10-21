"""Request and response shapes for craft notes."""

import re
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.study import not_blank, web_link

Behaviour = Literal["checklist", "technique", "reference", "path"]
CraftScreen = Literal["rewrite", "sets", "stage"]
# Preset area colours. Any "#rrggbb" works too, so colours never run out and can repeat.
PRESET_COLORS = (
    "sky",
    "violet",
    "emerald",
    "orange",
    "rose",
    "pink",
    "amber",
    "teal",
    "lime",
    "indigo",
    "coral",
    "slate",
)
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def area_color(value: str) -> str:
    """A preset name or a hex colour."""
    if value not in PRESET_COLORS and not HEX.match(value):
        raise ValueError("Pick a colour from the list, or a hex colour like #4fa3e0")
    return value


class CraftAreaIn(BaseModel):
    name: str = Field(max_length=80)
    description: str = Field(default="", max_length=200)
    color: str = "sky"
    screens: list[CraftScreen] = Field(default_factory=list)

    _name = field_validator("name")(not_blank)
    _color = field_validator("color")(area_color)

    @field_validator("screens")
    @classmethod
    def no_repeats(cls, values: list[CraftScreen]) -> list[CraftScreen]:
        return list(dict.fromkeys(values))


class CraftAreaOut(CraftAreaIn):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    position: int


class NoteKindIn(BaseModel):
    name: str = Field(max_length=60)
    behaviour: Behaviour = "reference"

    _name = field_validator("name")(not_blank)


class NoteKindOut(NoteKindIn):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    position: int


class AreaOrderIn(BaseModel):
    ids: list[uuid.UUID] = Field(max_length=200)


class CraftNoteIn(BaseModel):
    title: str = Field(max_length=200)
    body: str = ""
    kind_id: uuid.UUID
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
    # From the note's kind, so screens know how to show it without looking the kind up.
    behaviour: Behaviour
    created_at: datetime
    updated_at: datetime
