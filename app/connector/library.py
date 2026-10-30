"""Library tools: the overview, jokes and premises."""

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.connector.jokes import (
    brief,
    detail,
    load_names,
    rewrite_counts,
    sets_by_joke,
    topic_name,
    user_jokes,
)
from app.connector.text import clip, matches, page, same_name
from app.models import (
    CraftArea,
    CraftNote,
    Joke,
    JokeType,
    Observation,
    PerformanceLog,
    Premise,
    Setlist,
    Status,
    Topic,
    User,
)


def count(db: Session, model: Any, user: User) -> int:
    return db.scalar(select(func.count()).select_from(model).where(model.user_id == user.id)) or 0


def overview(db: Session, user: User) -> dict[str, Any]:
    """What's in JokeBox, with counts, so Claude knows where to look."""
    jokes = user_jokes(db, user)
    per_topic: dict[uuid.UUID, int] = {}
    per_sub: dict[uuid.UUID, int] = {}
    for j in jokes:
        per_topic[j.topic_id] = per_topic.get(j.topic_id, 0) + 1
        if j.subtopic_id:
            per_sub[j.subtopic_id] = per_sub.get(j.subtopic_id, 0) + 1
    topics = db.scalars(select(Topic).where(Topic.user_id == user.id).order_by(Topic.position))
    areas = db.scalars(
        select(CraftArea).where(CraftArea.user_id == user.id).order_by(CraftArea.position)
    )
    notes_per_area: dict[uuid.UUID, int] = {}
    for area_id in db.scalars(select(CraftNote.area_id).where(CraftNote.user_id == user.id)):
        notes_per_area[area_id] = notes_per_area.get(area_id, 0) + 1
    return {
        "jokes": len(jokes),
        "topics": [
            {
                "name": "Thoughts" if t.is_system else t.name,
                "jokes": per_topic.get(t.id, 0),
                "subtopics": [{"name": s.name, "jokes": per_sub.get(s.id, 0)} for s in t.subtopics],
            }
            for t in topics
        ],
        "premises": count(db, Premise, user),
        "sets": count(db, Setlist, user),
        "shows_logged": count(db, PerformanceLog, user),
        "observations": count(db, Observation, user),
        "craft_areas": [{"name": a.name, "notes": notes_per_area.get(a.id, 0)} for a in areas],
        "statuses": list(db.scalars(select(Status.name).where(Status.user_id == user.id))),
        "types": sorted(db.scalars(select(JokeType.name).where(JokeType.user_id == user.id))),
    }


def search_jokes(
    db: Session,
    user: User,
    query: str = "",
    topic: str = "",
    status: str = "",
    joke_type: str = "",
    min_strength: int = 1,
    premise_id: str = "",
    limit: int = 25,
) -> dict[str, Any]:
    """Jokes whose words match the query, narrowed by any of the filters."""
    names = load_names(db, user)
    found = [
        j
        for j in user_jokes(db, user)
        if matches(query, j.setup, j.punchline, " ".join(j.tag_lines or []), j.comments)
        and same_name(topic, topic_name(names, j.topic_id))
        and same_name(status, j.status.name if j.status else "")
        and (not joke_type or any(same_name(joke_type, t.name) for t in j.types))
        and j.strength >= min_strength
        and (not premise_id or str(j.premise_id) == premise_id)
    ]
    shown, total = page(found, limit)
    return {"total": total, "jokes": [brief(j, names) for j in shown]}


def get_jokes(db: Session, user: User, ids: list[str]) -> dict[str, Any]:
    """Full detail for up to 20 jokes. Ids that aren't yours (or are in the Trash) are listed."""
    names = load_names(db, user)
    jokes = {j.id: j for j in user_jokes(db, user)}
    sets, rewrites = sets_by_joke(db, user), rewrite_counts(db, user)
    wanted = [parse_id(i) for i in ids[:20]]
    return {
        "jokes": [detail(jokes[i], names, jokes, sets, rewrites) for i in wanted if i in jokes],
        "not_found": [str(i) for i in wanted if i not in jokes],
    }


def chain_order(jokes: list[Joke]) -> list[Joke]:
    """Jokes as their chains run: each start, then the jokes that follow it, oldest first."""
    ids = {j.id for j in jokes}
    by_age = sorted(jokes, key=lambda j: j.created_at)
    ordered: list[Joke] = []

    def walk(joke: Joke) -> None:
        ordered.append(joke)
        for nxt in (j for j in by_age if j.follows_id == joke.id):
            walk(nxt)

    for root in (j for j in by_age if j.follows_id not in ids):
        walk(root)
    return ordered


def list_premises(db: Session, user: User, query: str = "", topic: str = "") -> dict[str, Any]:
    names = load_names(db, user)
    counts: dict[uuid.UUID, int] = {}
    for premise_id in db.scalars(select(Joke.premise_id).where(Joke.user_id == user.id)):
        if premise_id:
            counts[premise_id] = counts.get(premise_id, 0) + 1
    rows = db.scalars(select(Premise).where(Premise.user_id == user.id).order_by(Premise.position))
    found = [
        {
            "id": str(p.id),
            "take": p.take,
            "topic": topic_name(names, p.topic_id),
            "jokes": counts.get(p.id, 0),
            "notes": clip(p.notes, 240),
        }
        for p in rows
        if matches(query, p.take, p.notes) and same_name(topic, topic_name(names, p.topic_id))
    ]
    return {"total": len(found), "premises": found}


def get_premise(db: Session, user: User, premise_id: str) -> dict[str, Any]:
    """A premise with its full notes and every joke on it, in chain order."""
    premise = db.scalar(
        select(Premise).where(Premise.id == parse_id(premise_id), Premise.user_id == user.id)
    )
    if premise is None:
        raise ValueError(f"No premise with id {premise_id}")
    names = load_names(db, user)
    on_it = [j for j in user_jokes(db, user) if j.premise_id == premise.id]
    return {
        "id": str(premise.id),
        "take": premise.take,
        "notes": clip(premise.notes, 8000),
        "topic": topic_name(names, premise.topic_id),
        "jokes": [
            {**brief(j, names), "follows_id": str(j.follows_id) if j.follows_id else None}
            for j in chain_order(on_it)
        ],
    }


def parse_id(value: str) -> uuid.UUID:
    try:
        return uuid.UUID(value.strip())
    except ValueError:
        raise ValueError(f"{value!r} isn't a JokeBox id") from None
