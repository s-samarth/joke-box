"""Brainstorms, setlists, venues and performance logs."""

import uuid
from datetime import UTC, datetime

from fastapi.testclient import TestClient

from tests.conftest import random_topic_id
from tests.test_jokes import put_joke

NOW = "2026-10-01T20:30:00+05:30"


def test_brainstorm_saves_append_versions(alice: TestClient) -> None:
    joke = put_joke(alice).json()
    bs_id = str(uuid.uuid4())
    body = {"joke_id": joke["id"], "title": "Take 1", "content": "draft", "timer_seconds": 42}
    alice.put(f"/api/brainstorms/{bs_id}", json=body)
    saved = alice.put(f"/api/brainstorms/{bs_id}", json={**body, "content": "draft 2"}).json()
    assert [v["content"] for v in saved["versions"]] == ["draft", "draft 2"]
    assert saved["timer_seconds"] == 42
    alice.delete(f"/api/brainstorm-versions/{saved['versions'][0]['id']}")
    assert len(alice.get("/api/brainstorms").json()[0]["versions"]) == 1


def test_deleting_a_joke_removes_its_brainstorms_and_set_entries(alice: TestClient) -> None:
    joke = put_joke(alice).json()
    alice.put(f"/api/brainstorms/{uuid.uuid4()}", json={"joke_id": joke["id"]})
    set_id = str(uuid.uuid4())
    alice.put(f"/api/setlists/{set_id}", json={"items": [{"joke_id": joke["id"]}]})
    alice.delete(f"/api/jokes/{joke['id']}")
    assert alice.get("/api/brainstorms").json() == []
    assert alice.get("/api/setlists").json()[0]["items"] == []


def test_setlist_keeps_order_and_creates_venue(alice: TestClient) -> None:
    a, b = put_joke(alice).json(), put_joke(alice).json()
    set_id = str(uuid.uuid4())
    body = {
        "name": "Friday",
        "target_seconds": 300,
        "venue_name": "Garage",
        "items": [
            {"joke_id": b["id"], "duration_seconds": 60},
            {"joke_id": a["id"], "duration_seconds": 30},
        ],
    }
    saved = alice.put(f"/api/setlists/{set_id}", json=body).json()
    assert [i["joke_id"] for i in saved["items"]] == [b["id"], a["id"]]
    assert saved["venue_name"] == "Garage"
    assert [v["name"] for v in alice.get("/api/venues").json()] == ["Garage"]
    reordered = alice.put(f"/api/setlists/{set_id}", json={**body, "items": body["items"][::-1]})
    assert [i["joke_id"] for i in reordered.json()["items"]] == [a["id"], b["id"]]


def test_setlist_rejects_other_users_jokes(alice: TestClient, bob: TestClient) -> None:
    joke = put_joke(alice).json()
    response = bob.put(f"/api/setlists/{uuid.uuid4()}", json={"items": [{"joke_id": joke["id"]}]})
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


def test_times_come_back_as_the_same_instant_in_utc(alice: TestClient) -> None:
    """8:30 pm IST is 15:00 UTC, and it comes back tagged UTC on every database, SQLite included."""
    log_id = str(uuid.uuid4())
    alice.put(f"/api/logs/{log_id}", json={"performed_at": "2026-10-01T20:30:00+05:30"})
    [log] = alice.get("/api/logs").json()
    assert datetime.fromisoformat(log["performed_at"]) == datetime(2026, 10, 1, 15, 0, tzinfo=UTC)
    assert datetime.fromisoformat(log["created_at"]).tzinfo is not None


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
    assert len(alice.get("/api/jokes").json()) == 17
    assert len(alice.get("/api/logs").json()) == 4
    assert len(alice.get("/api/setlists").json()[0]["items"]) == 3


def venue_id(client: TestClient, name: str) -> str:
    return next(v["id"] for v in client.get("/api/venues").json() if v["name"] == name)


def test_delete_an_unused_venue(alice: TestClient) -> None:
    alice.post("/api/venues", json={"name": "Typo Venue"})
    assert alice.delete(f"/api/venues/{venue_id(alice, 'Typo Venue')}").status_code == 204
    assert alice.get("/api/venues").json() == []


def test_deleting_a_used_venue_moves_its_shows_and_sets(alice: TestClient) -> None:
    alice.put(f"/api/logs/{uuid.uuid4()}", json={"venue_name": "Street ", "performed_at": NOW})
    alice.put(f"/api/setlists/{uuid.uuid4()}", json={"name": "Fake set", "venue_name": "Street "})
    alice.post("/api/venues", json={"name": "Street Mic"})
    old, new = venue_id(alice, "Street"), venue_id(alice, "Street Mic")
    counts = {v["name"]: (v["shows"], v["sets"]) for v in alice.get("/api/venues").json()}
    assert counts == {"Street": (1, 1), "Street Mic": (0, 0)}

    assert alice.delete(f"/api/venues/{old}").status_code == 409  # shows would lose their venue
    assert alice.delete(f"/api/venues/{old}", params={"move_to": old}).status_code == 422
    assert alice.delete(f"/api/venues/{old}", params={"move_to": new}).status_code == 204
    assert [log["venue_name"] for log in alice.get("/api/logs").json()] == ["Street Mic"]
    assert [s["venue_name"] for s in alice.get("/api/setlists").json()] == ["Street Mic"]
    assert [(v["name"], v["shows"]) for v in alice.get("/api/venues").json()] == [("Street Mic", 1)]


def test_cannot_delete_or_move_into_another_users_venue(alice: TestClient, bob: TestClient) -> None:
    alice.post("/api/venues", json={"name": "Alice Room"})
    bob.post("/api/venues", json={"name": "Bob Room"})
    alices, bobs = venue_id(alice, "Alice Room"), venue_id(bob, "Bob Room")
    assert bob.delete(f"/api/venues/{alices}").status_code == 404
    assert alice.delete(f"/api/venues/{alices}", params={"move_to": bobs}).status_code == 404
    assert [v["name"] for v in alice.get("/api/venues").json()] == ["Alice Room"]
