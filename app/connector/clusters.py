"""Clusters for Claude: versions of one joke kept together, one of them the lead.

A cluster's versions are whole jokes (each with its own status and show record), so Claude
reads them with get_jokes; list_clusters says which clusters there are and how each is doing,
and search_jokes can narrow to one cluster or count each cluster once (its lead).
"""

import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.connector.jokes import Names, is_lead, load_names, topic_name, user_jokes
from app.connector.show_record import EMPTY, records
from app.connector.text import clip, matches, page, same_name
from app.models import Joke, User
from app.services.clusters import is_discarded


def wanted(joke: Joke, names: Names, cluster_id: str, leads_only: bool) -> bool:
    """search_jokes' cluster filters: only this cluster's versions, and/or each cluster only
    once, as its lead (jokes in no cluster always count)."""
    if cluster_id and str(joke.cluster_id) != cluster_id.strip():
        return False
    return not (leads_only and joke.cluster_id and not is_lead(joke, names))


def together(done: list[dict[str, Any]]) -> dict[str, Any]:
    """The versions' show records added up: how often the joke, in any version, was done."""
    out = dict(EMPTY)
    for record in done:
        for key in ("shows_done", "killed", "ok", "bombed"):
            out[key] += record[key]
        if record["last_done"] and (not out["last_done"] or record["last_done"] > out["last_done"]):
            out["last_done"] = record["last_done"]
    return out


def summary(
    cluster_id: uuid.UUID, versions: list[Joke], names: Names, done: dict[uuid.UUID, Any]
) -> dict[str, Any]:
    cluster = names.clusters[cluster_id]
    versions.sort(key=lambda j: (not is_lead(j, names), j.created_at))
    lead = versions[0] if is_lead(versions[0], names) else None
    return {
        "id": str(cluster_id),
        "title": cluster.title,
        "notes": clip(cluster.notes, 300),
        "lead": {"id": str(lead.id), "setup": clip(lead.setup, 200)} if lead else None,
        "topic": topic_name(names, versions[0].topic_id),
        "versions": len(versions),
        "discarded": sum(1 for j in versions if is_discarded(j)),
        "version_ids": [str(j.id) for j in versions],
        "shows": together([done.get(j.id, EMPTY) for j in versions]),
    }


def list_clusters(
    db: Session,
    user: User,
    query: str = "",
    topic: str = "",
    min_versions: int = 1,
    limit: int = 25,
    offset: int = 0,
) -> dict[str, Any]:
    """Every cluster with a version out of the Trash, the most versions first."""
    names = load_names(db, user)
    grouped: dict[uuid.UUID, list[Joke]] = {}
    for joke in user_jokes(db, user):
        if joke.cluster_id in names.clusters:
            grouped.setdefault(joke.cluster_id, []).append(joke)
    found = [
        (cid, versions)
        for cid, versions in grouped.items()
        if len(versions) >= min_versions
        and any(same_name(topic, topic_name(names, j.topic_id)) for j in versions)
        and matches(
            query,
            names.clusters[cid].title,
            names.clusters[cid].notes,
            *(f for j in versions for f in (j.setup, j.punchline)),
        )
    ]
    found.sort(key=lambda c: (-len(c[1]), -max(j.updated_at.timestamp() for j in c[1])))
    shown, total = page(found, limit, offset=offset)
    done = records(db, user, (j.id for _, versions in shown for j in versions))
    after = max(0, offset) + len(shown)
    return {
        "total": total,
        "next_offset": after if after < total else None,
        "clusters": [summary(cid, versions, names, done) for cid, versions in shown],
    }
