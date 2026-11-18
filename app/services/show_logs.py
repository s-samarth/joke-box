"""Saving a logged show: from the app (PUT /api/logs/{id}) and from the set-review engine
(the connector's log_show), which also brings the laugh timeline it heard in the recording."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.deps import find_owned
from app.models import PerformanceLog, ShowReview, Topic, User, Venue
from app.schemas.reviews import ReviewIn
from app.schemas.shows import LogIn
from app.services.show_jokes import set_jokes, wanted, your_jokes
from app.services.trash import trashed_joke_ids


def venue_named(db: Session, user: User, name: str) -> Venue:
    """Find a venue case-insensitively, creating it inline if new."""
    name = name.strip()
    venue = db.scalar(
        select(Venue).where(Venue.user_id == user.id, func.lower(Venue.name) == name.lower())
    )
    if venue is None:
        venue = Venue(user_id=user.id, name=name)
        db.add(venue)
        db.flush()
    return venue


def set_review(log: PerformanceLog, review: ReviewIn, on_show: set[uuid.UUID]) -> None:
    """Replace the show's laugh timeline. A laugh credited to a joke that isn't on the show is
    kept, but credited to nothing: the timeline never points at someone else's joke."""
    events = [
        {**e.model_dump(mode="json"), "joke_id": str(e.joke_id) if e.joke_id in on_show else None}
        for e in sorted(review.events, key=lambda e: e.start)
    ]
    if log.review is None:
        log.review = ShowReview(engine_version=review.engine_version, events=events)
    else:
        log.review.engine_version, log.review.events = review.engine_version, events


def save_show(
    db: Session, user: User, log_id: uuid.UUID, body: LogIn, review: ReviewIn | None = None
) -> PerformanceLog:
    """Create or update a show. The caller has checked the topics are the user's own."""
    hidden = trashed_joke_ids(db, user)
    jokes = wanted(body.jokes or [], hidden, your_jokes(db, user, body.jokes or []))
    topic_ids = set(body.topic_ids)
    topics = list(db.scalars(select(Topic).where(Topic.id.in_(topic_ids)))) if topic_ids else []
    log = find_owned(db, PerformanceLog, log_id, user) or PerformanceLog(id=log_id, user_id=user.id)
    log.venue = venue_named(db, user, body.venue_name)
    log.performed_at = body.performed_at
    log.duration_seconds = body.duration_seconds
    log.audience_size = body.audience_size
    log.rating = body.rating
    log.notes = body.notes
    log.laughs = body.laughs
    log.topics = topics
    if body.title is not None:  # left out by app versions from before titles: it stays
        log.title = body.title.strip()
    if body.jokes is not None:  # left out by app versions from before: the jokes stay
        set_jokes(log, jokes, hidden)
    if review is not None:
        set_review(log, review, {j.joke_id for j in jokes})
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
