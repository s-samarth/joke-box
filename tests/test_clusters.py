"""Clusters: versions of one joke, a lead, and what happens as versions come and go."""

import uuid
from typing import Any

from fastapi.testclient import TestClient

from tests.test_jokes import put_joke


def put_cluster(client: TestClient, cluster_id: str | None = None, **fields: Any) -> Any:
    cluster_id = cluster_id or str(uuid.uuid4())
    return client.put(f"/api/clusters/{cluster_id}", json=fields)


def version(client: TestClient, cluster: str, setup: str, **fields: Any) -> str:
    joke_id = str(uuid.uuid4())
    response = put_joke(client, joke_id, setup=setup, cluster_id=cluster, **fields)
    assert response.status_code == 200
    return joke_id


def cluster(client: TestClient, cluster_id: str) -> dict[str, Any] | None:
    return next((c for c in client.get("/api/clusters").json() if c["id"] == cluster_id), None)


def lead(client: TestClient, cluster_id: str) -> str | None:
    found = cluster(client, cluster_id)
    return found and found["lead_joke_id"]


def new(client: TestClient, *setups: str) -> tuple[str, list[str]]:
    """A cluster whose first version leads, as the app makes one from a joke."""
    cid = str(uuid.uuid4())
    first = str(uuid.uuid4())
    put_cluster(client, cid, title="Fake core", lead_joke_id=first)
    put_joke(client, first, setup=setups[0], cluster_id=cid)
    return cid, [first, *(version(client, cid, s) for s in setups[1:])]


def test_make_a_cluster_and_pick_a_lead(alice: TestClient) -> None:
    cid, (a, b) = new(alice, "Fake A", "Fake B")
    assert lead(alice, cid) == a
    assert put_cluster(alice, cid, title="Fake core", lead_joke_id=b).status_code == 200
    assert lead(alice, cid) == b
    put_cluster(alice, cid, title="Fake renamed")  # a rename keeps the lead
    assert lead(alice, cid) == b
    put_cluster(alice, cid, lead_joke_id=a)  # and a new lead keeps the title
    assert (cluster(alice, cid) or {})["title"] == "Fake renamed"
    assert {j["setup"]: j["cluster_id"] for j in alice.get("/api/jokes").json()} == {
        "Fake A": cid,
        "Fake B": cid,
    }


def test_an_older_app_leaves_the_cluster_alone(alice: TestClient) -> None:
    cid, (a,) = new(alice, "Fake A")
    put_joke(alice, a, setup="Fake A, edited")
    assert alice.get(f"/api/jokes/{a}").json()["cluster_id"] == cid


def test_a_discarded_lead_hands_on_to_the_strongest(alice: TestClient) -> None:
    cid, (a, b, c) = new(alice, "Fake A", "Fake B", "Fake C")
    put_joke(alice, c, setup="Fake C", cluster_id=cid, strength=4)
    put_joke(alice, a, setup="Fake A", cluster_id=cid, status="Discarded")
    assert lead(alice, cid) == c
    put_joke(alice, a, setup="Fake A", cluster_id=cid, status="Testing")
    assert lead(alice, cid) == c  # coming back doesn't take the lead back
    assert put_cluster(alice, cid, title="", lead_joke_id=b).json()["lead_joke_id"] == b


def test_a_discarded_joke_cannot_be_made_lead(alice: TestClient) -> None:
    cid, (a, b) = new(alice, "Fake A", "Fake B")
    put_joke(alice, b, setup="Fake B", cluster_id=cid, status="Discarded")
    assert put_cluster(alice, cid, lead_joke_id=b).json()["lead_joke_id"] == a


def test_one_version_left_stays_a_cluster(alice: TestClient) -> None:
    cid, (a, b) = new(alice, "Fake A", "Fake B")
    put_joke(alice, a, setup="Fake A", cluster_id=None)
    assert lead(alice, cid) == b
    put_joke(alice, b, setup="Fake B", status="Discarded")  # every version discarded
    assert lead(alice, cid) == b
    put_joke(alice, b, setup="Fake B", cluster_id=None)  # the last one out: it goes
    assert cluster(alice, cid) is None


def test_the_trash_keeps_a_version_in_its_cluster(alice: TestClient) -> None:
    cid, (a, b) = new(alice, "Fake A", "Fake B")
    alice.delete(f"/api/jokes/{a}")
    assert lead(alice, cid) == b
    alice.delete(f"/api/jokes/{b}")
    assert cluster(alice, cid) is not None  # only trashed versions: out of sight, still there
    alice.post(f"/api/trash/jokes/{a}/restore")
    assert alice.get(f"/api/jokes/{a}").json()["cluster_id"] == cid
    alice.delete(f"/api/jokes/{a}")
    alice.delete("/api/trash")  # erased for good: nothing left, so the cluster goes
    assert cluster(alice, cid) is None


def test_dissolving_keeps_every_joke(alice: TestClient) -> None:
    cid, (a, b) = new(alice, "Fake A", "Fake B")
    alice.delete(f"/api/jokes/{b}")
    assert alice.delete(f"/api/clusters/{cid}").status_code == 204
    assert alice.delete(f"/api/clusters/{cid}").status_code == 204  # a replay is fine
    assert alice.get(f"/api/jokes/{a}").json()["cluster_id"] is None
    alice.post(f"/api/trash/jokes/{b}/restore")
    assert alice.get(f"/api/jokes/{b}").json()["cluster_id"] is None
    # A version saved offline after the dissolve is saved on its own.
    assert put_joke(alice, a, setup="Fake A", cluster_id=cid).json()["cluster_id"] is None


def test_edits_from_two_devices_clash(alice: TestClient) -> None:
    cid, _ = new(alice, "Fake A")
    put_cluster(alice, cid, title="Fake one", base_version=1)
    assert put_cluster(alice, cid, title="Fake two", base_version=1).status_code == 409


def test_clusters_are_private(alice: TestClient, bob: TestClient) -> None:
    cid, _ = new(alice, "Fake A")
    assert bob.get("/api/clusters").json() == []
    assert put_cluster(bob, cid, title="Fake").status_code == 404
    assert put_joke(bob, setup="Fake", cluster_id=cid).status_code == 422


def test_undoing_a_dissolve_keeps_the_lead(alice: TestClient) -> None:
    """The cluster comes back first, then its jokes one by one; the lead waits for its own."""
    cid, (a, b, c) = new(alice, "Fake A", "Fake B", "Fake C")
    put_cluster(alice, cid, lead_joke_id=c)
    alice.delete(f"/api/clusters/{cid}")
    put_cluster(alice, cid, title="Fake core", notes="", lead_joke_id=c)
    for joke_id, setup in ((a, "Fake A"), (b, "Fake B"), (c, "Fake C")):
        put_joke(alice, joke_id, setup=setup, cluster_id=cid)
        assert lead(alice, cid) == c


def test_a_lead_taken_out_hands_on(alice: TestClient) -> None:
    cid, (a, b) = new(alice, "Fake A", "Fake B")
    put_joke(alice, a, setup="Fake A", cluster_id=None)
    assert lead(alice, cid) == b
