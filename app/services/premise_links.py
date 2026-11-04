"""A premise's jokes while it's in the Trash.

A joke resting on a premise in the Trash would point at something the app can't show, and
every list, filter and save would have to know to look past it. So the jokes are set loose,
just as when a premise is deleted for good, and the premise remembers which they were.
Putting it back puts them back on it, except any that have since been put on another premise.
"""

import uuid

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import Joke, Premise, User
from app.models.trash import INCLUDE_TRASHED


def set_loose(db: Session, user: User, premise: Premise) -> None:
    """Jokes in the Trash too: they'd come back resting on a premise that isn't there."""
    on_it = select(Joke.id).where(Joke.user_id == user.id, Joke.premise_id == premise.id)
    ids = db.scalars(on_it.execution_options(**{INCLUDE_TRASHED: True})).all()
    premise.trashed_joke_ids = [str(i) for i in ids]
    db.execute(
        update(Joke)
        .where(Joke.user_id == user.id, Joke.premise_id == premise.id)
        .values(premise_id=None)
    )


def put_back(db: Session, user: User, premise: Premise) -> None:
    ids = [uuid.UUID(i) for i in premise.trashed_joke_ids or []]
    if ids:
        db.execute(
            update(Joke)
            .where(Joke.user_id == user.id, Joke.id.in_(ids), Joke.premise_id.is_(None))
            .values(premise_id=premise.id)
        )
    premise.trashed_joke_ids = None
