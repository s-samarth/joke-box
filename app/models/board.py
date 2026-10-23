"""Where you've moved jokes on the joke board."""

import uuid

from sqlalchemy import Float, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, OwnedMixin


class BoardSpot(OwnedMixin, Base):
    """A joke you placed by hand. The board lays jokes out in topic islands; a spot is relative
    to the top left of its island, so the joke moves with the island as the board grows. It's
    kept apart from the joke so moving a box never touches the joke's version or edit time."""

    __tablename__ = "board_spots"

    joke_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("jokes.id", ondelete="CASCADE"), unique=True
    )
    # The island it was placed in. If the joke has moved to another topic since, the spot is
    # ignored.
    topic_id: Mapped[uuid.UUID] = mapped_column(Uuid)
    x: Mapped[float] = mapped_column(Float)
    y: Mapped[float] = mapped_column(Float)
