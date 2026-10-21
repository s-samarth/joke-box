"""All tables, imported in one place so Alembic sees every model."""

from app.models.base import Base
from app.models.craft import CraftArea, CraftNote, NoteKind
from app.models.library import (
    RANDOM_TOPIC,
    Bit,
    BitType,
    Status,
    Subtopic,
    Topic,
    bit_type_links,
)
from app.models.notebook import Observation, ObservationTopic, WritingSession
from app.models.shows import (
    PerformanceLog,
    Setlist,
    SetlistItem,
    Venue,
    performance_log_topics,
)
from app.models.studio import Brainstorm, BrainstormVersion
from app.models.study import Analysis, WatchItem
from app.models.user import User
from app.models.voice import VoiceNote

__all__ = [
    "RANDOM_TOPIC",
    "Analysis",
    "Base",
    "Bit",
    "BitType",
    "Brainstorm",
    "BrainstormVersion",
    "CraftArea",
    "CraftNote",
    "NoteKind",
    "Observation",
    "ObservationTopic",
    "PerformanceLog",
    "Setlist",
    "SetlistItem",
    "Status",
    "Subtopic",
    "Topic",
    "User",
    "Venue",
    "VoiceNote",
    "WatchItem",
    "WritingSession",
    "bit_type_links",
    "performance_log_topics",
]
