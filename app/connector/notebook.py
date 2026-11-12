"""Notebook tools: observations, Brainstorm sessions and joke Rewrites."""

from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, undefer

from app.connector.ink_image import pages_with_ink
from app.connector.origins import brainstorms_using
from app.connector.text import by_id, clip, ist_date, matches, page, same_name
from app.models import (
    Brainstorm,
    CraftNote,
    Joke,
    Observation,
    ObservationTopic,
    Premise,
    Topic,
    User,
    WritingSession,
)

# The kind of an observation filed under no kind.
PLAIN = "Observation"


def live_links(db: Session, user: User) -> tuple[set[str], set[str]]:
    """The ids of your premises and jokes that aren't in the Trash, as links store them."""
    premises = db.scalars(select(Premise.id).where(Premise.user_id == user.id))
    jokes = db.scalars(select(Joke.id).where(Joke.user_id == user.id))
    return {str(i) for i in premises}, {str(i) for i in jokes}


def observations_behind(db: Session, user: User) -> dict[str, list[dict[str, str]]]:
    """For each premise and joke id, the observations it came from (newest first)."""
    behind: dict[str, list[dict[str, str]]] = {}
    rows = db.scalars(
        select(Observation)
        .where(Observation.user_id == user.id)
        .order_by(Observation.created_at.desc())
    )
    for o in rows:
        for target in [*(o.premise_ids or []), *(o.joke_ids or [])]:
            behind.setdefault(target, []).append({"id": str(o.id), "text": clip(o.text, 800)})
    return behind


def search_observations(
    db: Session, user: User, query: str = "", topic: str = "", limit: int = 25, kind: str = ""
) -> dict[str, Any]:
    """Things you noticed, newest first. `topic` is a joke topic; `kind` is what sort of note it
    is, and a plain observation's kind is "Observation". `premise_ids` and `joke_ids` are what
    came from it, `brainstorm_ids` the sessions it was brainstormed in (all none: not used yet)."""
    kinds = by_id(
        db.execute(
            select(ObservationTopic.id, ObservationTopic.name).where(
                ObservationTopic.user_id == user.id
            )
        )
    )
    topics = by_id(db.execute(select(Topic.id, Topic.name).where(Topic.user_id == user.id)))
    rows = db.scalars(
        select(Observation)
        .where(Observation.user_id == user.id)
        .order_by(Observation.created_at.desc())
    )

    def topic_of(o: Observation) -> str | None:
        return topics.get(o.topic_id) if o.topic_id else None

    def kind_of(o: Observation) -> str:
        return kinds.get(o.kind_id, PLAIN) if o.kind_id else PLAIN

    found = [
        o
        for o in rows
        if matches(query, o.text, o.extra_notes)
        and same_name(topic, topic_of(o))
        and same_name(kind, kind_of(o))
    ]
    shown, total = page(found, limit)
    premises, jokes = live_links(db, user)
    sessions = brainstorms_using(db, user)
    return {
        "total": total,
        "observations": [
            {
                "id": str(o.id),
                "text": clip(o.text, 800),
                "extra_notes": clip(o.extra_notes, 2000),
                "topic": topic_of(o),
                "kind": kind_of(o),
                "noted": ist_date(o.created_at),
                "premise_ids": [i for i in o.premise_ids or [] if i in premises],
                "joke_ids": [i for i in o.joke_ids or [] if i in jokes],
                "brainstorm_ids": sessions.get(str(o.id), []),
            }
            for o in shown
        ],
    }


def search_brainstorms(db: Session, user: User, query: str = "", limit: int = 25) -> dict[str, Any]:
    """Brainstorm sessions and Rewrites of a joke together, most recently changed first, by
    title and typed text (handwriting is counted, and read with get_brainstorm)."""
    techniques = by_id(
        db.execute(select(CraftNote.id, CraftNote.title).where(CraftNote.user_id == user.id))
    )
    sessions = db.scalars(
        select(WritingSession)
        .where(WritingSession.user_id == user.id)
        .options(undefer(WritingSession.ink))  # deferred on the model; pages are counted here
    )
    rewrites = db.scalars(select(Brainstorm).where(Brainstorm.user_id == user.id))
    found: list[tuple[datetime, dict[str, Any]]] = [
        (
            s.updated_at,
            {
                "kind": "brainstorm",
                "id": str(s.id),
                "title": s.title,
                "text": clip(s.content, 2000),
                "technique": techniques.get(s.technique_id) if s.technique_id else None,
                "linked_joke_ids": list(s.joke_ids or []),
                "handwritten_pages": len(pages_with_ink(s.ink or [])),
                "updated": ist_date(s.updated_at),
            },
        )
        for s in sessions
        if matches(query, s.title, s.content)
    ]
    found += [
        (
            r.updated_at,
            {
                "kind": "rewrite",
                "id": str(r.id),
                "joke_id": str(r.joke_id),
                "title": r.title,
                "text": clip(r.content, 2000),
                "updated": ist_date(r.updated_at),
            },
        )
        for r in rewrites
        if matches(query, r.title, r.content)
    ]
    found.sort(key=lambda pair: pair[0], reverse=True)
    shown, total = page([result for _, result in found], limit)
    return {"total": total, "results": shown}
