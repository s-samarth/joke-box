"""A save that waited offline can name something deleted since it was made: a topic, a
subtopic, an observation kind, a Craft area or kind, a technique. Refusing it would leave the
save stuck in Couldn't sync for good, so the caller falls back to where the delete moved things
(Random, Subtopic unknown) or to nothing. A row that exists but is someone else's is still refused.
"""

import uuid

from sqlalchemy.orm import Session

from app.models.base import Base


def deleted(
    db: Session, model: type[Base], row_id: uuid.UUID | None, *mixed_up: type[Base]
) -> bool:
    """True when the id names no row at all (deleted since the save was made). An id that names
    a row of a `mixed_up` kind (a joke topic given as an observation kind) is still refused."""
    if row_id is None:
        return False
    return all(db.get(m, row_id) is None for m in (model, *mixed_up))
