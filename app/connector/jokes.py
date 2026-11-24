"""Reading jokes: one short shape for lists, and the full detail for a few at a time."""

import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.connector.text import by_id, clip
from app.models import Brainstorm, Joke, JokeCluster, Premise, Setlist, Subtopic, Topic, User


@dataclass
class Names:
    """Topic, subtopic and premise names by id, so a joke can say where it lives, and the
    clusters, so it can say which versions it has and whether it leads them."""

    topics: dict[uuid.UUID, str]
    subtopics: dict[uuid.UUID, str]
    premises: dict[uuid.UUID, str]
    clusters: dict[uuid.UUID, JokeCluster]


def load_names(db: Session, user: User) -> Names:
    return Names(
        topics=by_id(db.execute(select(Topic.id, Topic.name).where(Topic.user_id == user.id))),
        subtopics=by_id(
            db.execute(select(Subtopic.id, Subtopic.name).where(Subtopic.user_id == user.id))
        ),
        premises=by_id(
            db.execute(select(Premise.id, Premise.take).where(Premise.user_id == user.id))
        ),
        clusters={
            c.id: c for c in db.scalars(select(JokeCluster).where(JokeCluster.user_id == user.id))
        },
    )


def topic_name(names: Names, topic_id: uuid.UUID) -> str:
    """The topic as the app shows it. The protected topic is stored and shown as Random."""
    return names.topics.get(topic_id, "")


def user_jokes(db: Session, user: User) -> list[Joke]:
    """All live jokes, newest first, with their types and status loaded."""
    query = (
        select(Joke)
        .where(Joke.user_id == user.id)
        .options(selectinload(Joke.types), selectinload(Joke.status))
        .order_by(Joke.updated_at.desc())
    )
    return list(db.scalars(query))


def lines(joke: Joke) -> list[str]:
    """A joke's lines besides the setup and the punchline in use: tag lines and other punches."""
    return [*(joke.tag_lines or []), *(joke.alt_punchlines or [])]


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
        "cluster_id": str(joke.cluster_id) if joke.cluster_id else None,
        "lead": is_lead(joke, names),
    }


def is_lead(joke: Joke, names: Names) -> bool:
    """The version of its cluster you'd do tonight (the server keeps the lead valid)."""
    found = names.clusters.get(joke.cluster_id) if joke.cluster_id else None
    return found is not None and found.lead_joke_id == joke.id


def cluster_of(joke: Joke, names: Names, jokes: dict[uuid.UUID, Joke]) -> dict[str, Any] | None:
    """The cluster a joke is a version in: its core idea and every live version, lead first."""
    found = names.clusters.get(joke.cluster_id) if joke.cluster_id else None
    if found is None:
        return None
    mine = [j for j in jokes.values() if j.cluster_id == found.id]
    mine.sort(key=lambda j: (not is_lead(j, names), j.created_at))
    each = [
        {
            "id": str(j.id),
            "setup": clip(j.setup, 160),
            "status": j.status.name if j.status else None,
            "lead": is_lead(j, names),
        }
        for j in mine
    ]
    return {
        "id": str(found.id),
        "title": found.title,
        "notes": clip(found.notes, 2000),
        "versions": each,
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
        "alt_punchlines": list(joke.alt_punchlines or []),
        "hashtags": list(joke.hashtags or []),
        "notes": clip(joke.comments, 4000),
        "premise": names.premises.get(joke.premise_id) if joke.premise_id else None,
        "clean_rating": joke.clean_rating,
        "language": joke.language,
        "follows": {"id": str(before.id), "setup": clip(before.setup, 160)} if before else None,
        "followed_by": [{"id": str(j.id), "setup": clip(j.setup, 160)} for j in after],
        "in_sets": sets.get(joke.id, []),
        "rewrites": rewrites.get(joke.id, 0),
        "cluster": cluster_of(joke, names, jokes),
    }


def hashtags(joke: Joke) -> list[str]:
    """A joke's hashtags, each with its #, whichever way it was saved."""
    return ["#" + h.strip().lstrip("#") for h in joke.hashtags or [] if h.strip().lstrip("#")]


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
