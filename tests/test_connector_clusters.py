"""Clusters through the connector: listing them, narrowing search to one, counting each once."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.connector import clusters, library, search
from tests.conftest import signed_in
from tests.test_clusters import put_cluster
from tests.test_connector_show_record import log, me
from tests.test_jokes import put_joke


@pytest.fixture
def dev() -> TestClient:
    return signed_in("dev@example.com")


def cluster_of(client: TestClient, title: str, *setups: str) -> tuple[str, list[str]]:
    """A cluster whose first version leads."""
    cid = str(uuid.uuid4())
    ids = [str(uuid.uuid4()) for _ in setups]
    put_cluster(client, cid, title=title, lead_joke_id=ids[0])
    for joke_id, setup in zip(ids, setups, strict=True):
        put_joke(client, joke_id, setup=setup, cluster_id=cid)
    return cid, ids


def test_clusters_are_listed_most_versions_first(dev: TestClient, db: Session) -> None:
    small, _ = cluster_of(dev, "Fake small", "Fake one", "Fake two")
    big, (lead, other, gone) = cluster_of(dev, "", "Fake gym A", "Fake gym B", "Fake gym C")
    put_joke(dev, gone, setup="Fake gym C", cluster_id=big, status="Discarded")
    log(dev, "2026-09-01T20:00:00+05:30", [{"joke_id": lead, "result": "killed"}])
    log(dev, "2026-10-01T20:00:00+05:30", [{"joke_id": other, "result": "bombed"}])
    found = clusters.list_clusters(db, me(db))
    assert [c["id"] for c in found["clusters"]] == [big, small]
    first = found["clusters"][0]
    assert first["lead"] == {"id": lead, "setup": "Fake gym A"}
    assert (first["versions"], first["discarded"], first["version_ids"][0]) == (3, 1, lead)
    assert first["shows"] == {
        "shows_done": 2,
        "killed": 1,
        "ok": 0,
        "bombed": 1,
        "last_done": "2026-10-01",
    }
    assert clusters.list_clusters(db, me(db), query="gym B")["total"] == 1
    assert clusters.list_clusters(db, me(db), min_versions=3)["total"] == 1
    assert library.overview(db, me(db))["clusters"] == 2


def test_search_narrows_to_a_cluster_or_counts_each_once(dev: TestClient, db: Session) -> None:
    cid, (lead, other) = cluster_of(dev, "Fake core", "Fake fridge A", "Fake fridge B")
    put_joke(dev, setup="Fake fridge, on its own")
    inside = search.search_jokes(db, me(db), cluster_id=cid)
    assert {j["id"] for j in inside["jokes"]} == {lead, other}
    once = search.search_jokes(db, me(db), query="fridge", leads_only=True)
    assert {j["setup"] for j in once["jokes"]} == {"Fake fridge A", "Fake fridge, on its own"}
    assert next(j for j in once["jokes"] if j["id"] == lead)["lead"] is True


def test_a_cluster_with_every_version_in_the_trash_is_not_listed(
    dev: TestClient, db: Session
) -> None:
    _, (only,) = cluster_of(dev, "Fake", "Fake joke")
    dev.delete(f"/api/jokes/{only}")
    assert clusters.list_clusters(db, me(db))["clusters"] == []
