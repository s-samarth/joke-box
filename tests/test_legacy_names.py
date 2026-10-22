"""An app version from before jokes were renamed keeps working: old address, old field names."""

import uuid

from fastapi.testclient import TestClient

from tests.conftest import random_topic_id


def old_joke(client: TestClient) -> str:
    joke_id = str(uuid.uuid4())
    body = {"setup": "Fake setup", "topic_id": random_topic_id(client)}
    assert client.put(f"/api/bits/{joke_id}", json=body).status_code == 200
    return joke_id


def test_the_old_address_still_saves_reads_and_deletes(alice: TestClient) -> None:
    joke_id = old_joke(alice)
    assert alice.get(f"/api/bits/{joke_id}").json()["id"] == joke_id
    assert [j["id"] for j in alice.get("/api/jokes").json()] == [joke_id]
    assert [j["id"] for j in alice.get("/api/bits").json()] == [joke_id]
    assert alice.delete(f"/api/bits/{joke_id}").status_code == 204
    assert alice.get("/api/jokes").json() == []


def test_old_field_names_are_read_and_sent_back(alice: TestClient) -> None:
    joke_id = old_joke(alice)
    items = alice.put(f"/api/setlists/{uuid.uuid4()}", json={"items": [{"bit_id": joke_id}]})
    [item] = items.json()["items"]
    assert item["joke_id"] == item["bit_id"] == joke_id

    rewrite = alice.put(f"/api/brainstorms/{uuid.uuid4()}", json={"bit_id": joke_id})
    assert rewrite.json()["joke_id"] == rewrite.json()["bit_id"] == joke_id

    session = alice.put(f"/api/sessions/{uuid.uuid4()}", json={"bit_ids": [joke_id]})
    assert session.json()["joke_ids"] == session.json()["bit_ids"] == [joke_id]
