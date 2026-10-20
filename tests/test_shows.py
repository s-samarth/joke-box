"""Brainstorms, setlists, venues and performance logs."""

import uuid

from fastapi.testclient import TestClient

from tests.conftest import random_topic_id
from tests.test_bits import put_bit


def test_brainstorm_saves_append_versions(alice: TestClient) -> None:
    bit = put_bit(alice).json()
    bs_id = str(uuid.uuid4())
    body = {"bit_id": bit["id"], "title": "Take 1", "content": "draft", "timer_seconds": 42}
    alice.put(f"/api/brainstorms/{bs_id}", json=body)
    saved = alice.put(f"/api/brainstorms/{bs_id}", json={**body, "content": "draft 2"}).json()
    assert [v["content"] for v in saved["versions"]] == ["draft", "draft 2"]
    assert saved["timer_seconds"] == 42
    alice.delete(f"/api/brainstorm-versions/{saved['versions'][0]['id']}")
    assert len(alice.get("/api/brainstorms").json()[0]["versions"]) == 1


def test_deleting_a_bit_removes_its_brainstorms_and_set_entries(alice: TestClient) -> None:
    bit = put_bit(alice).json()
    alice.put(f"/api/brainstorms/{uuid.uuid4()}", json={"bit_id": bit["id"]})
    set_id = str(uuid.uuid4())
    alice.put(f"/api/setlists/{set_id}", json={"items": [{"bit_id": bit["id"]}]})
    alice.delete(f"/api/bits/{bit['id']}")
    assert alice.get("/api/brainstorms").json() == []
    assert alice.get("/api/setlists").json()[0]["items"] == []


def test_setlist_keeps_order_and_creates_venue(alice: TestClient) -> None:
    a, b = put_bit(alice).json(), put_bit(alice).json()
    set_id = str(uuid.uuid4())
    body = {
        "name": "Friday",
        "target_seconds": 300,
        "venue_name": "Garage",
        "items": [
            {"bit_id": b["id"], "duration_seconds": 60},
            {"bit_id": a["id"], "duration_seconds": 30},
        ],
    }
    saved = alice.put(f"/api/setlists/{set_id}", json=body).json()
    assert [i["bit_id"] for i in saved["items"]] == [b["id"], a["id"]]
    assert saved["venue_name"] == "Garage"
    assert [v["name"] for v in alice.get("/api/venues").json()] == ["Garage"]
    reordered = alice.put(f"/api/setlists/{set_id}", json={**body, "items": body["items"][::-1]})
    assert [i["bit_id"] for i in reordered.json()["items"]] == [a["id"], b["id"]]


def test_setlist_rejects_other_users_bits(alice: TestClient, bob: TestClient) -> None:
    bit = put_bit(alice).json()
    response = bob.put(f"/api/setlists/{uuid.uuid4()}", json={"items": [{"bit_id": bit["id"]}]})
    assert response.status_code == 422


def test_log_a_mic(alice: TestClient) -> None:
    topic_id = random_topic_id(alice)
    log_id = str(uuid.uuid4())
    body = {
        "venue_name": "garage",
        "performed_at": "2026-10-01T20:30:00+05:30",
        "duration_seconds": 390,
        "audience_size": 28,
        "rating": 4,
        "topic_ids": [topic_id],
        "notes": "fake notes",
    }
    alice.post("/api/venues", json={"name": "Garage"})
    saved = alice.put(f"/api/logs/{log_id}", json=body).json()
    assert saved["venue_name"] == "Garage"  # matched case-insensitively, not duplicated
    assert saved["topic_ids"] == [topic_id]
    assert len(alice.get("/api/venues").json()) == 1


def test_deleting_a_topic_repoints_logs_to_random(alice: TestClient) -> None:
    topic = alice.post("/api/topics", json={"name": "Dating"}).json()
    log = {"performed_at": "2026-10-01T20:30:00Z", "topic_ids": [topic["id"]]}
    alice.put(f"/api/logs/{uuid.uuid4()}", json=log)
    alice.delete(f"/api/topics/{topic['id']}")
    assert alice.get("/api/logs").json()[0]["topic_ids"] == [random_topic_id(alice)]


def test_other_users_cannot_see_my_shows(alice: TestClient, bob: TestClient) -> None:
    log_id, set_id = str(uuid.uuid4()), str(uuid.uuid4())
    alice.put(f"/api/logs/{log_id}", json={"performed_at": "2026-10-01T20:30:00Z"})
    alice.put(f"/api/setlists/{set_id}", json={})
    assert bob.get("/api/logs").json() == [] and bob.get("/api/setlists").json() == []
    assert bob.delete(f"/api/logs/{log_id}").status_code == 404
    assert bob.put(f"/api/setlists/{set_id}", json={}).status_code == 404
    assert (
        bob.put(f"/api/logs/{log_id}", json={"performed_at": "2026-10-01T20:30:00Z"}).status_code
        == 404
    )


def test_demo_reseed(alice: TestClient) -> None:
    assert alice.post("/api/dev/reseed").status_code == 204
    assert len(alice.get("/api/bits").json()) == 17
    assert len(alice.get("/api/logs").json()) == 4
    assert len(alice.get("/api/setlists").json()[0]["items"]) == 3
