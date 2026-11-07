"""Observations filed under a joke topic and a kind, and saves from apps made before kinds."""

import uuid

from fastapi.testclient import TestClient


def put_obs(client: TestClient, obs_id: str, **fields: object):  # type: ignore[no-untyped-def]
    body = {"text": "Fake thing noticed at a bus stop", **fields}
    return client.put(f"/api/observations/{obs_id}", json=body)


def joke_topic(client: TestClient, name: str) -> str:
    return str(client.post("/api/topics", json={"name": name}).json()["id"])


def kind(client: TestClient, name: str) -> str:
    return str(client.post("/api/observation-topics", json={"name": name}).json()["id"])


def test_an_observation_has_a_topic_and_a_kind(alice: TestClient) -> None:
    topic, sets = joke_topic(alice, "Buses"), kind(alice, "Set ideas")
    saved = put_obs(alice, str(uuid.uuid4()), kind_id=sets, topic_id=topic).json()
    assert (saved["topic_id"], saved["kind_id"]) == (topic, sets)


def test_a_new_one_starts_not_sorted(alice: TestClient) -> None:
    saved = put_obs(alice, str(uuid.uuid4()), kind_id=None).json()
    assert (saved["topic_id"], saved["kind_id"]) == (None, None)


def test_a_save_without_the_topic_keeps_it(alice: TestClient) -> None:
    obs_id, topic = str(uuid.uuid4()), joke_topic(alice, "Buses")
    put_obs(alice, obs_id, kind_id=None, topic_id=topic)
    assert put_obs(alice, obs_id, text="Edited", kind_id=None).json()["topic_id"] == topic


def test_an_old_app_save_means_the_kind_and_keeps_the_topic(alice: TestClient) -> None:
    """Before kinds, `topic_id` was the observation's own topic, now its kind."""
    obs_id, topic, sets = str(uuid.uuid4()), joke_topic(alice, "Buses"), kind(alice, "Set ideas")
    put_obs(alice, obs_id, kind_id=None, topic_id=topic)
    old = put_obs(alice, obs_id, text="Edited on an old phone", topic_id=sets).json()
    assert (old["text"], old["kind_id"], old["topic_id"]) == ("Edited on an old phone", sets, topic)


def test_an_old_app_save_of_a_new_one_is_not_sorted(alice: TestClient) -> None:
    sets = kind(alice, "Set ideas")
    saved = put_obs(alice, str(uuid.uuid4()), topic_id=sets).json()
    assert (saved["kind_id"], saved["topic_id"]) == (sets, None)


def test_a_kind_cant_be_used_as_a_topic_or_the_other_way(alice: TestClient) -> None:
    topic, sets = joke_topic(alice, "Buses"), kind(alice, "Set ideas")
    assert put_obs(alice, str(uuid.uuid4()), kind_id=topic).status_code == 404
    assert put_obs(alice, str(uuid.uuid4()), kind_id=None, topic_id=sets).status_code == 404


def test_deleting_a_topic_moves_its_observations_to_random(alice: TestClient) -> None:
    topic = joke_topic(alice, "Buses")
    obs = put_obs(alice, str(uuid.uuid4()), kind_id=None, topic_id=topic).json()
    assert alice.delete(f"/api/topics/{topic}").status_code == 204
    random = next(t["id"] for t in alice.get("/api/topics").json() if t["name"] == "Random")
    kept = alice.get("/api/observations").json()[0]
    assert (kept["id"], kept["topic_id"]) == (obs["id"], random)


def test_filing_it_under_a_topic_is_checked_for_two_devices(alice: TestClient) -> None:
    obs_id, topic = str(uuid.uuid4()), joke_topic(alice, "Buses")
    first = put_obs(alice, obs_id, kind_id=None).json()
    put_obs(alice, obs_id, kind_id=None, topic_id=topic, base_version=first["version"])
    stale = put_obs(alice, obs_id, kind_id=None, topic_id=None, base_version=first["version"])
    assert stale.status_code == 409
