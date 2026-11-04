"""A save queued before jokes were renamed still goes through: requests take the old field names."""

import uuid

from fastapi.testclient import TestClient

from tests.conftest import random_topic_id


def new_joke(client: TestClient) -> str:
    joke_id = str(uuid.uuid4())
    body = {"setup": "Fake setup", "topic_id": random_topic_id(client)}
    assert client.put(f"/api/jokes/{joke_id}", json=body).status_code == 200
    return joke_id


def test_the_old_address_is_gone(alice: TestClient) -> None:
    assert alice.get("/api/bits").status_code == 404


def test_old_field_names_are_still_read(alice: TestClient) -> None:
    joke_id = new_joke(alice)
    items = alice.put(f"/api/setlists/{uuid.uuid4()}", json={"items": [{"bit_id": joke_id}]})
    [item] = items.json()["items"]
    assert item["joke_id"] == joke_id
    assert "bit_id" not in item

    rewrite = alice.put(f"/api/brainstorms/{uuid.uuid4()}", json={"bit_id": joke_id})
    assert rewrite.json()["joke_id"] == joke_id

    session = alice.put(f"/api/sessions/{uuid.uuid4()}", json={"bit_ids": [joke_id]})
    assert session.json()["joke_ids"] == [joke_id]
    assert "bit_ids" not in session.json()
