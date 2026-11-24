"""Clusters: keeping the lead valid, letting jokes go, and tidying away empty ones.

The rules, in one place (the browser follows the same ones in `web/src/lib/clusters.ts`):
- The lead is a version that isn't discarded or in the Trash, while the cluster has one. When it
  stops being one, the strongest such version takes over (the most recently edited, on a tie),
  and keeps the lead after the old one comes back.
- With every version discarded the lead stays where it was: the cluster counts as discarded.
- A cluster with no jokes at all, not even in the Trash, goes by itself.
"""

import uuid

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import Joke, JokeCluster, User
from app.models.trash import INCLUDE_TRASHED
from app.schemas.clusters import ClusterIn
from app.services.clashes import check_fields

CLUSTER_CLASH = "This cluster was changed on another device after you edited it."
DISCARDED = "discarded"


def is_discarded(joke: Joke) -> bool:
    """As the app counts it: a status called Discarded, in any case."""
    return bool(joke.status and joke.status.name.strip().lower() == DISCARDED)


def is_active(joke: Joke) -> bool:
    return joke.deleted_at is None and not is_discarded(joke)


def versions(db: Session, user: User, cluster_id: uuid.UUID) -> list[Joke]:
    """Every joke in the cluster, the Trash included."""
    query = select(Joke).where(Joke.user_id == user.id, Joke.cluster_id == cluster_id)
    return list(db.scalars(query.execution_options(**{INCLUDE_TRASHED: True})))


def pick_lead(jokes: list[Joke]) -> Joke:
    """The strongest, then the most recently edited. Unrated counts as weakest."""
    return max(jokes, key=lambda j: (j.strength or 0, j.updated_at))


def settle(db: Session, user: User, cluster_id: uuid.UUID | None, drop_empty: bool = True) -> None:
    """Put the lead right after a version changed, and remove the cluster once it's empty.

    `drop_empty` is off when the cluster itself is saved: a new one is saved before its first
    joke (offline, they queue in that order), so it's empty for a moment on purpose.
    """
    cluster = db.get(JokeCluster, cluster_id) if cluster_id else None
    if cluster is None or cluster.user_id != user.id:
        return
    db.flush()
    everyone = versions(db, user, cluster.id)
    if not everyone:
        if drop_empty:
            db.delete(cluster)
        return
    active = [j for j in everyone if is_active(j)]
    live = [j for j in everyone if j.deleted_at is None]
    pool = active or live or everyone
    if cluster.lead_joke_id not in {j.id for j in pool}:
        cluster.lead_joke_id = pick_lead(pool).id


def save(
    db: Session, user: User, cluster_id: uuid.UUID, body: ClusterIn, cluster: JokeCluster | None
) -> JokeCluster:
    """Create or update. A save that leaves the lead out keeps it."""
    fields: dict[str, object] = {"title": body.title.strip(), "notes": body.notes}
    if "lead_joke_id" in body.model_fields_set:
        fields["lead_joke_id"] = body.lead_joke_id
    if cluster is None:
        cluster = JokeCluster(id=cluster_id, user_id=user.id)
        db.add(cluster)
    else:
        check_fields(cluster, body.base_version, fields, CLUSTER_CLASH)
    for name, value in fields.items():
        setattr(cluster, name, value)
    settle(db, user, cluster.id, drop_empty=False)
    db.commit()
    db.refresh(cluster)
    return cluster


def dissolve(db: Session, user: User, cluster: JokeCluster) -> None:
    """Every version goes back to being a joke on its own (the Trash too); nothing is deleted."""
    db.execute(
        update(Joke)
        .where(Joke.user_id == user.id, Joke.cluster_id == cluster.id)
        .values(cluster_id=None)
        .execution_options(synchronize_session=False)
    )
    db.delete(cluster)
    db.commit()
