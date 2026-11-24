"""Clusters: list, create-or-update by client id, dissolve.

A joke joins or leaves a cluster through its own save (`cluster_id`), so a version written
offline syncs like any joke. Only the cluster's own words and its lead are saved here.
"""

import uuid

from fastapi import APIRouter
from sqlalchemy import select

from app.auth.deps import CurrentUser, DbSession, find_owned
from app.models import JokeCluster
from app.schemas.clusters import ClusterIn, ClusterOut
from app.services import clusters as svc

router = APIRouter(prefix="/api/clusters", tags=["clusters"])


@router.get("", response_model=list[ClusterOut])
def list_clusters(user: CurrentUser, db: DbSession) -> list[JokeCluster]:
    query = select(JokeCluster).where(JokeCluster.user_id == user.id)
    return list(db.scalars(query.order_by(JokeCluster.created_at)))


@router.put("/{cluster_id}", response_model=ClusterOut)
def put_cluster(
    cluster_id: uuid.UUID, body: ClusterIn, user: CurrentUser, db: DbSession
) -> JokeCluster:
    """Create or update. The client picks the id, so a retried offline save never duplicates."""
    cluster = find_owned(db, JokeCluster, cluster_id, user)
    return svc.save(db, user, cluster_id, body, cluster)


@router.delete("/{cluster_id}", status_code=204)
def dissolve_cluster(cluster_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    """Dissolve: its jokes stay, each on its own. Already gone is fine, so replays are safe."""
    cluster = find_owned(db, JokeCluster, cluster_id, user)
    if cluster is not None:
        svc.dissolve(db, user, cluster)
