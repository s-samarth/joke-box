"""search_jokes: jokes matching words and filters, a page at a time (see server_jokes.py)."""

from typing import Any

from sqlalchemy.orm import Session

from app.connector.clusters import wanted
from app.connector.jokes import brief, hashtags, lines, load_names, topic_name, user_jokes
from app.connector.text import matches, page, same_name
from app.models import User


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
    subtopic: str = "",
    offset: int = 0,
    cluster_id: str = "",
    leads_only: bool = False,
) -> dict[str, Any]:
    """Jokes whose words match the query, narrowed by any of the filters, a page at a time."""
    names = load_names(db, user)
    found = [
        j
        for j in user_jokes(db, user)
        if matches(query, j.setup, j.punchline, j.comments, *lines(j), *hashtags(j))
        and same_name(topic, topic_name(names, j.topic_id))
        and same_name(subtopic, names.subtopics.get(j.subtopic_id) if j.subtopic_id else "")
        and same_name(status, j.status.name if j.status else "")
        and (not joke_type or any(same_name(joke_type, t.name) for t in j.types))
        and (min_strength <= 1 or (j.strength or 0) >= min_strength)
        and (not premise_id or str(j.premise_id) == premise_id)
        and wanted(j, names, cluster_id, leads_only)
    ]
    shown, total = page(found, limit, offset=offset)
    after = max(0, offset) + len(shown)
    return {
        "total": total,
        "next_offset": after if after < total else None,
        "jokes": [brief(j, names) for j in shown],
    }
