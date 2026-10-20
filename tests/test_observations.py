"""Observations: logged on their own, with topics kept apart from joke topics."""

import uuid

from fastapi.testclient import TestClient


def put_obs(client: TestClient, obs_id: str | None = None, **fields: object):  # type: ignore[no-untyped-def]
    body = {"text": "Fake observation about queues", **fields}
    return client.put(f"/api/observations/{obs_id or uuid.uuid4()}", json=body)


def make_topic(client: TestClient, name: str) -> str:
    response = client.post("/api/observation-topics", json={"name": name})
    assert response.status_code == 201
    return str(response.json()["id"])


def test_create_update_and_list(alice: TestClient) -> None:
    obs_id = str(uuid.uuid4())
    assert put_obs(alice, obs_id).status_code == 200
    assert put_obs(alice, obs_id, text="  Edited fake note  ").json()["text"] == "Edited fake note"
    assert [o["id"] for o in alice.get("/api/observations").json()] == [obs_id]


def test_text_is_required(alice: TestClient) -> None:
    assert put_obs(alice, text="   ").status_code == 422


def test_observation_topics_are_separate_from_joke_topics(alice: TestClient) -> None:
    make_topic(alice, "Airports")
    assert "Airports" not in [t["name"] for t in alice.get("/api/topics").json()]
    assert alice.post("/api/observation-topics", json={"name": "airports"}).status_code == 409


def test_deleting_a_topic_keeps_its_observations(alice: TestClient) -> None:
    topic_id = make_topic(alice, "Metro")
    obs = put_obs(alice, topic_id=topic_id).json()
    assert alice.delete(f"/api/observation-topics/{topic_id}").status_code == 204
    kept = alice.get("/api/observations").json()[0]
    assert (kept["id"], kept["topic_id"]) == (obs["id"], None)


def test_rename_topic(alice: TestClient) -> None:
    topic_id = make_topic(alice, "Metro")
    alice.patch(f"/api/observation-topics/{topic_id}", json={"name": "Trains"})
    assert [t["name"] for t in alice.get("/api/observation-topics").json()] == ["Trains"]


def test_delete_is_idempotent(alice: TestClient) -> None:
    obs_id = put_obs(alice).json()["id"]
    assert alice.delete(f"/api/observations/{obs_id}").status_code == 204
    assert alice.delete(f"/api/observations/{obs_id}").status_code == 204


def test_other_users_cannot_see_or_touch_mine(alice: TestClient, bob: TestClient) -> None:
    topic_id = make_topic(alice, "Mine")
    obs_id = put_obs(alice, topic_id=topic_id).json()["id"]
    assert bob.get("/api/observations").json() == []
    assert bob.get("/api/observation-topics").json() == []
    assert put_obs(bob, obs_id).status_code == 404
    assert put_obs(bob, topic_id=topic_id).status_code == 404
    assert bob.patch(f"/api/observation-topics/{topic_id}", json={"name": "x"}).status_code == 404
    assert bob.delete(f"/api/observation-topics/{topic_id}").status_code == 404
    bob.delete(f"/api/observations/{obs_id}")
    assert len(alice.get("/api/observations").json()) == 1
