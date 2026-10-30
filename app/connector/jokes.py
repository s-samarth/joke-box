"""Reading jokes: one short shape for lists, and the full detail for a few at a time."""

import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.connector.text import by_id, clip
from app.models import Brainstorm, Joke, Premise, Setlist, Subtopic, Topic, User


@dataclass
class Names:
    """Topic, subtopic and premise names by id, so a joke can say where it lives."""

    topics: dict[uuid.UUID, str]
    subtopics: dict[uuid.UUID, str]
    premises: dict[uuid.UUID, str]


def load_names(db: Session, user: User) -> Names:
    return Names(
        topics=by_id(db.execute(select(Topic.id, Topic.name).where(Topic.user_id == user.id))),
        subtopics=by_id(
            db.execute(select(Subtopic.id, Subtopic.name).where(Subtopic.user_id == user.id))
        ),
        premises=by_id(
            db.execute(select(Premise.id, Premise.take).where(Premise.user_id == user.id))
        ),
    )


def topic_name(names: Names, topic_id: uuid.UUID) -> str:
    """The topic as the app shows it: the system topic is called Thoughts."""
    name = names.topics.get(topic_id, "")
    return "Thoughts" if name == "Random" else name


def user_jokes(db: Session, user: User) -> list[Joke]:
    """All live jokes, newest first, with their types and status loaded."""
    query = (
        select(Joke)
        .where(Joke.user_id == user.id)
        .options(selectinload(Joke.types), selectinload(Joke.status))
        .order_by(Joke.updated_at.desc())
    )
    return list(db.scalars(query))


def brief(joke: Joke, names: Names) -> dict[str, Any]:
    """A joke in a list: enough to recognise it and decide whether to open it."""
    return {
        "id": str(joke.id),
        "setup": clip(joke.setup, 240),
        "punchline": clip(joke.punchline, 240),
        "topic": topic_name(names, joke.topic_id),
        "subtopic": names.subtopics.get(joke.subtopic_id) if joke.subtopic_id else None,
        "premise_id": str(joke.premise_id) if joke.premise_id else None,
        "status": joke.status.name if joke.status else None,
        "strength": joke.strength,
        "seconds": joke.duration_seconds,
        "types": [t.name for t in joke.types],
    }


def sets_by_joke(db: Session, user: User) -> dict[uuid.UUID, list[dict[str, Any]]]:
    """For each joke, the sets it's in and where."""
    query = select(Setlist).where(Setlist.user_id == user.id).options(selectinload(Setlist.items))
    found: dict[uuid.UUID, list[dict[str, Any]]] = {}
    for s in db.scalars(query):
        for place, item in enumerate(s.items, start=1):
            entry = {"set_id": str(s.id), "set": s.name, "place": place, "of": len(s.items)}
            found.setdefault(item.joke_id, []).append(entry)
    return found


def rewrite_counts(db: Session, user: User) -> dict[uuid.UUID, int]:
    counts: dict[uuid.UUID, int] = {}
    for joke_id in db.scalars(select(Brainstorm.joke_id).where(Brainstorm.user_id == user.id)):
        counts[joke_id] = counts.get(joke_id, 0) + 1
    return counts


def detail(
    joke: Joke,
    names: Names,
    jokes: dict[uuid.UUID, Joke],
    sets: dict[uuid.UUID, list[dict[str, Any]]],
    rewrites: dict[uuid.UUID, int],
) -> dict[str, Any]:
    """Everything about one joke, including what it follows and what follows it."""
    before = jokes.get(joke.follows_id) if joke.follows_id else None
    after = [j for j in jokes.values() if j.follows_id == joke.id]
    return {
        **brief(joke, names),
        "setup": joke.setup,
        "punchline": joke.punchline,
        "tag_lines": list(joke.tag_lines or []),
        "hashtags": list(joke.hashtags or []),
        "notes": clip(joke.comments, 4000),
        "premise": names.premises.get(joke.premise_id) if joke.premise_id else None,
        "clean_rating": joke.clean_rating,
        "language": joke.language,
        "follows": {"id": str(before.id), "setup": clip(before.setup, 160)} if before else None,
        "followed_by": [{"id": str(j.id), "setup": clip(j.setup, 160)} for j in after],
        "in_sets": sets.get(joke.id, []),
        "rewrites": rewrites.get(joke.id, 0),
    }
