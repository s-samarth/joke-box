"""Request and response shapes for voice notes."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class VoiceNoteIn(BaseModel):
    """What the client sends about a note. The audio goes separately, as raw bytes."""

    label: str = Field(default="", max_length=200)
    hashtags: list[str] = Field(default_factory=list, max_length=30)
    duration_seconds: int = Field(default=0, ge=0, le=6 * 60 * 60)


class VoiceNoteOut(VoiceNoteIn):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    content_type: str
    size_bytes: int
    has_audio: bool
    created_at: datetime
    updated_at: datetime
