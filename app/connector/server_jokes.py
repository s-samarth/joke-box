"""The tools Claude uses to find jokes and the clusters they're versions in. Both read only.

The work lives in search.py and clusters.py; these wrappers give each tool its name, its
description (the docstring, which Claude reads to decide when to call it) and its session.
"""

from typing import Any

from app.connector import clusters, search
from app.connector.base import READ, server
from app.connector.identity import reading


@server.tool(annotations=READ)
def search_jokes(
    query: str = "",
    topic: str = "",
    subtopic: str = "",
    status: str = "",
    joke_type: str = "",
    min_strength: int = 1,
    premise_id: str = "",
    cluster_id: str = "",
    leads_only: bool = False,
    limit: int = 25,
    offset: int = 0,
) -> dict[str, Any]:
    """Find jokes. Every word of `query` must appear in the setup, punchline, tag lines,
    hashtags or notes; a word starting with # finds that hashtag. Filters are exact names
    (topic, subtopic, status, type), a strength from 1 to 5 and up, a premise id, or a cluster
    id (that cluster's versions only). Strength is 1 (Weak) to 5 (Killer), or null when the
    comic hasn't rated the joke yet; a min_strength above 1 leaves unrated jokes out. Each joke
    says its `cluster_id` and whether it's that cluster's `lead`; `leads_only` lists each
    cluster once, as its lead, so versions aren't counted as separate material. Returns short
    versions (at most 25) and the total; open them with get_jokes. When next_offset is set,
    call again with that offset for the rest."""
    with reading() as (db, user):
        return search.search_jokes(
            db,
            user,
            query,
            topic,
            status,
            joke_type,
            min_strength,
            premise_id,
            limit,
            subtopic=subtopic,
            offset=offset,
            cluster_id=cluster_id,
            leads_only=leads_only,
        )


@server.tool(annotations=READ)
def list_clusters(
    query: str = "",
    topic: str = "",
    min_versions: int = 1,
    limit: int = 25,
    offset: int = 0,
) -> dict[str, Any]:
    """Clusters: versions of one joke the comic keeps together (the same punch, said another
    way), the most versions first. Each has its `title` (the core idea; empty when the comic
    hasn't named it), `notes`, its `lead` (`id`, `setup`: the version they'd do tonight),
    `topic`, how many `versions` and how many of those are `discarded`, `version_ids` (lead
    first: open them with get_jokes to compare them) and `shows`, the versions' show records
    added up. `query` words must appear in the title, notes or a version's words; `topic`
    keeps clusters with a version in that topic. At most 25 a call; next_offset for the rest."""
    with reading() as (db, user):
        return clusters.list_clusters(db, user, query, topic, min_versions, limit, offset)
