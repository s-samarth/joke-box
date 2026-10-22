"""Signing a user in: create or update their row and make sure their defaults exist."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import RANDOM_TOPIC, Status, Topic, User
from app.models.base import utcnow
from app.services.craft_areas import ensure_craft_areas
from app.services.craft_kinds import ensure_craft_kinds
from app.services.set_tags import add_default_set_tags

DEFAULT_STATUSES = [
    "Incomplete",
    "Work in Progress",
    "Complete",
    "Status Unknown",
    "Draft",
    "Stage Ready",
]


def upsert_user(db: Session, *, email: str, google_sub: str | None, name: str, avatar: str) -> User:
    """Find the user by Google id (or email), refresh their profile, and stamp the login."""
    email = email.lower()
    user = None
    if google_sub:
        user = db.scalar(select(User).where(User.google_sub == google_sub))
    if user is None:
        user = db.scalar(select(User).where(User.email == email))
    new = user is None
    if user is None:
        user = User(email=email)
        db.add(user)
    user.google_sub = google_sub or user.google_sub
    user.email = email
    user.display_name = name or email.split("@")[0]
    user.avatar_url = avatar
    user.last_login_at = utcnow()
    db.flush()
    ensure_defaults(db, user)
    if new:
        add_default_set_tags(db, user)
    db.commit()
    return user


def ensure_defaults(db: Session, user: User) -> None:
    """Every user has the protected Random topic, default statuses, craft areas and kinds."""
    random_topic = db.scalar(
        select(Topic).where(Topic.user_id == user.id, func.lower(Topic.name) == "random")
    )
    if random_topic is None:
        db.add(Topic(user_id=user.id, name=RANDOM_TOPIC, is_system=True))
    elif not random_topic.is_system:
        random_topic.is_system = True
    has_statuses = db.scalar(select(func.count()).where(Status.user_id == user.id))
    if not has_statuses:
        for position, name in enumerate(DEFAULT_STATUSES):
            db.add(Status(user_id=user.id, name=name, position=position))
    ensure_craft_areas(db, user)
    ensure_craft_kinds(db, user)
    db.flush()


def random_topic_for(db: Session, user: User) -> Topic:
    """The user's Random topic, created if somehow missing."""
    ensure_defaults(db, user)
    topic = db.scalar(select(Topic).where(Topic.user_id == user.id, Topic.is_system.is_(True)))
    assert topic is not None
    return topic
