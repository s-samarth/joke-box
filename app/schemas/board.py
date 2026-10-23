"""The joke board: jokes you've placed by hand."""

import uuid

from pydantic import BaseModel, ConfigDict, Field

# Far beyond any real board, so a bad number can't push a joke off into nowhere.
LIMIT = 100_000


class BoardSpotIn(BaseModel):
    topic_id: uuid.UUID
    x: float = Field(ge=0, le=LIMIT)
    y: float = Field(ge=0, le=LIMIT)


class BoardSpotOut(BoardSpotIn):
    model_config = ConfigDict(from_attributes=True)

    joke_id: uuid.UUID


class TidyIn(BaseModel):
    """The jokes to put back in the grid; none at all means every joke."""

    joke_ids: list[uuid.UUID] = Field(default_factory=list, max_length=5000)
