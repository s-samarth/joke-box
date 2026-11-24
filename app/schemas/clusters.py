"""Clusters: versions of one joke, kept together under a lead."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.limits import INT_MAX


class ClusterIn(BaseModel):
    # The core idea, in a line. Empty: the lead's setup stands in for it. Each of these three left
    # out keeps what's stored, so picking a lead never undoes a title typed on the way.
    title: str | None = Field(default=None, max_length=2000)
    notes: str | None = Field(default=None, max_length=20_000)
    # The version you'd do tonight.
    lead_joke_id: uuid.UUID | None = None
    # The version this edit started from. Omitted (a new one), nothing is checked.
    base_version: int | None = Field(default=None, le=INT_MAX)


class ClusterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    notes: str
    lead_joke_id: uuid.UUID | None
    version: int
    created_at: datetime
    updated_at: datetime
