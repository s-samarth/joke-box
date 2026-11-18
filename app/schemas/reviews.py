"""A show's laugh timeline from the set-review engine, as it's sent and read back."""

import uuid
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.limits import INT_MAX

# A long show with a hot room still has far fewer than this; the cap keeps a save small.
MAX_EVENTS = 2000


class ReviewEvent(BaseModel):
    """One laugh or applause break, in seconds into the recording."""

    start: float = Field(ge=0, le=INT_MAX)
    end: float = Field(ge=0, le=INT_MAX)
    kind: Literal["laugh", "applause"]
    points: int = Field(ge=1, le=5)
    # The joke it's credited to, or None for crowd work, a riff, or anything unmatched.
    joke_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def ends_after_start(self) -> "ReviewEvent":
        if self.end < self.start:
            raise ValueError("An event can't end before it starts")
        return self


class ReviewIn(BaseModel):
    engine_version: str = Field(min_length=1, max_length=40)
    events: list[ReviewEvent] = Field(default_factory=list, max_length=MAX_EVENTS)


class ReviewOut(ReviewIn):
    pass
