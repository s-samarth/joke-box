"""All tables, imported in one place so Alembic sees every model."""

from app.models.base import Base
from app.models.library import (
    RANDOM_TOPIC,
    Bit,
    BitType,
    Status,
    Subtopic,
    Topic,
    bit_type_links,
)
from app.models.notebook import Observation, ObservationTopic
from app.models.shows import (
    PerformanceLog,
    Setlist,
    SetlistItem,
    Venue,
    performance_log_topics,
)
from app.models.studio import Brainstorm, BrainstormVersion
from app.models.user import User

__all__ = [
    "RANDOM_TOPIC",
    "Base",
    "Bit",
    "BitType",
    "Brainstorm",
    "BrainstormVersion",
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
    "bit_type_links",
    "performance_log_topics",
]
