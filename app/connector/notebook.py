"""Notebook tools: observations, Brainstorm sessions and joke Rewrites."""

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.connector.text import by_id, clip, ist_date, matches, page, same_name
from app.models import Brainstorm, CraftNote, Observation, ObservationTopic, User, WritingSession


def search_observations(
    db: Session, user: User, query: str = "", topic: str = "", limit: int = 25
) -> dict[str, Any]:
    """Things you noticed, newest first."""
    topics = by_id(
        db.execute(
            select(ObservationTopic.id, ObservationTopic.name).where(
                ObservationTopic.user_id == user.id
            )
        )
    )
    rows = db.scalars(
        select(Observation)
        .where(Observation.user_id == user.id)
        .order_by(Observation.created_at.desc())
    )
    found = [
        o
        for o in rows
        if matches(query, o.text) and same_name(topic, topics.get(o.topic_id) if o.topic_id else "")
    ]
    shown, total = page(found, limit)
    return {
        "total": total,
        "observations": [
            {
                "id": str(o.id),
                "text": clip(o.text, 800),
                "topic": topics.get(o.topic_id) if o.topic_id else None,
                "noted": ist_date(o.created_at),
            }
            for o in shown
        ],
    }


def search_brainstorms(db: Session, user: User, query: str = "", limit: int = 25) -> dict[str, Any]:
    """Typed text from Brainstorm sessions and from Rewrites of a joke (not the handwriting)."""
    techniques = by_id(
        db.execute(select(CraftNote.id, CraftNote.title).where(CraftNote.user_id == user.id))
    )
    sessions = db.scalars(
        select(WritingSession)
        .where(WritingSession.user_id == user.id)
        .order_by(WritingSession.updated_at.desc())
    )
    rewrites = db.scalars(
        select(Brainstorm)
        .where(Brainstorm.user_id == user.id)
        .order_by(Brainstorm.updated_at.desc())
    )
    found: list[dict[str, Any]] = [
        {
            "kind": "brainstorm",
            "id": str(s.id),
            "title": s.title,
            "text": clip(s.content, 2000),
            "technique": techniques.get(s.technique_id) if s.technique_id else None,
            "linked_joke_ids": list(s.joke_ids or []),
            "updated": ist_date(s.updated_at),
        }
        for s in sessions
        if matches(query, s.title, s.content)
    ]
    found += [
        {
            "kind": "rewrite",
            "id": str(r.id),
            "joke_id": str(r.joke_id),
            "title": r.title,
            "text": clip(r.content, 2000),
            "updated": ist_date(r.updated_at),
        }
        for r in rewrites
        if matches(query, r.title, r.content)
    ]
    shown, total = page(found, limit)
    return {"total": total, "results": shown}
