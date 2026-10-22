"""Set tags: the starting ones a new user gets."""

from sqlalchemy.orm import Session

from app.models import SetTag, User

DEFAULT_SET_TAGS = [
    "In progress",
    "Weak",
    "Incomplete",
    "Complete",
    "Opener set",
    "Closer set",
    "Story",
    "One-liners",
]


def add_default_set_tags(db: Session, user: User) -> None:
    """Only for a new user (and once for everyone, in migration 0015): deleting them all sticks."""
    for position, name in enumerate(DEFAULT_SET_TAGS):
        db.add(SetTag(user_id=user.id, name=name, position=position))
