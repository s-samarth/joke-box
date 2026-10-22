"""Bits: create, update, types and statuses by name, and user isolation."""

import uuid
from typing import Any

from fastapi.testclient import TestClient

from tests.conftest import random_topic_id


def put_bit(client: TestClient, bit_id: str | None = None, **fields: Any) -> Any:
    bit_id = bit_id or str(uuid.uuid4())
    body = {"setup": "Fake setup", "topic_id": random_topic_id(client), **fields}
    return client.put(f"/api/bits/{bit_id}", json=body)


def test_create_and_update_bit(alice: TestClient) -> None:
    bit_id = str(uuid.uuid4())
    created = put_bit(alice, bit_id, punchline="Fake punch", types=["One-Liner"], status="Draft")
    assert created.status_code == 200
    assert created.json()["types"] == ["One-Liner"]
    updated = put_bit(alice, bit_id, setup="Edited", tag_lines=["tag one"], clean_rating="mild")
    body = updated.json()
    assert (body["setup"], body["tag_lines"], body["clean_rating"]) == (
        "Edited",
        ["tag one"],
        "mild",
    )
    assert len(alice.get("/api/bits").json()) == 1


def test_retrying_the_same_put_does_not_duplicate(alice: TestClient) -> None:
    bit_id = str(uuid.uuid4())
    put_bit(alice, bit_id)
    put_bit(alice, bit_id)
    assert len(alice.get("/api/bits").json()) == 1


def test_types_are_created_inline_and_pruned_when_unused(alice: TestClient) -> None:
    bit_id = str(uuid.uuid4())
    put_bit(alice, bit_id, types=["Story", "story", "Roast"])
    assert sorted(t["name"] for t in alice.get("/api/types").json()) == ["Roast", "Story"]
    put_bit(alice, bit_id, types=["Story"])
    assert [t["name"] for t in alice.get("/api/types").json()] == ["Story"]
    alice.delete(f"/api/bits/{bit_id}")
    assert [t["name"] for t in alice.get("/api/types").json()] == ["Story"]  # kept while in Trash
    alice.delete("/api/trash")
    assert alice.get("/api/types").json() == []


def test_undefined_is_not_stored_as_a_type(alice: TestClient) -> None:
    assert put_bit(alice, types=["Undefined"]).json()["types"] == []


def test_new_status_is_created_inline(alice: TestClient) -> None:
    put_bit(alice, status="Needs Tag")
    assert "Needs Tag" in [s["name"] for s in alice.get("/api/statuses").json()]


def test_validation(alice: TestClient) -> None:
    assert put_bit(alice, setup="   ").status_code == 422
    assert put_bit(alice, strength=6).status_code == 422
    assert put_bit(alice, topic_id=str(uuid.uuid4())).status_code == 422


def test_other_users_cannot_touch_my_bits(alice: TestClient, bob: TestClient) -> None:
    bit_id = put_bit(alice).json()["id"]
    assert bob.get(f"/api/bits/{bit_id}").status_code == 404
    assert put_bit(bob, bit_id, setup="stolen").status_code == 404
    assert bob.delete(f"/api/bits/{bit_id}").status_code == 404
    assert bob.get("/api/bits").json() == []
    assert alice.get(f"/api/bits/{bit_id}").json()["setup"] == "Fake setup"


def test_cannot_file_a_bit_in_someone_elses_topic(alice: TestClient, bob: TestClient) -> None:
    assert put_bit(bob, topic_id=random_topic_id(alice)).status_code == 422


def test_a_backdated_joke_was_last_changed_when_it_was_written(alice: TestClient) -> None:
    """Imports keep their old date as written and last changed; an edit moves only the latter."""
    bit_id = str(uuid.uuid4())
    old = put_bit(alice, bit_id, created_at="2024-07-19T16:30:00Z").json()
    assert old["created_at"] == old["updated_at"]
    assert old["updated_at"].startswith("2024-07-19")
    edited = put_bit(alice, bit_id, setup="Fake edit").json()
    assert edited["created_at"].startswith("2024-07-19")
    assert edited["updated_at"] > edited["created_at"]


def test_a_joke_written_offline_keeps_the_time_it_was_written(alice: TestClient) -> None:
    # Written at 11:50 pm IST, synced the next morning: it still counts for the day it was written.
    saved = put_bit(alice, str(uuid.uuid4()), created_at="2026-10-21T18:20:00Z").json()
    assert saved["created_at"].startswith("2026-10-21T18:20")


def test_each_save_moves_the_version_on(alice: TestClient) -> None:
    bit_id = str(uuid.uuid4())
    topic = random_topic_id(alice)
    assert put_bit(alice, bit_id, topic_id=topic).json()["version"] == 1
    assert (
        put_bit(alice, bit_id, topic_id=topic, setup="Edited", base_version=1).json()["version"]
        == 2
    )


def test_an_edit_from_an_older_version_is_refused_not_overwritten(alice: TestClient) -> None:
    # The laptop saves version 2; the phone, offline, edited version 1 and syncs afterwards.
    bit_id = str(uuid.uuid4())
    topic = random_topic_id(alice)
    put_bit(alice, bit_id, topic_id=topic)
    put_bit(alice, bit_id, topic_id=topic, setup="Laptop edit", base_version=1)
    phone = put_bit(alice, bit_id, topic_id=topic, setup="Phone edit", base_version=1)
    assert phone.status_code == 409
    assert alice.get("/api/bits").json()[0]["setup"] == "Laptop edit"


def test_resending_the_same_edit_is_not_a_conflict(alice: TestClient) -> None:
    # A save that reached the server but whose answer was lost is sent again with the old version.
    bit_id = str(uuid.uuid4())
    topic = random_topic_id(alice)
    put_bit(alice, bit_id, topic_id=topic)
    first = put_bit(
        alice, bit_id, topic_id=topic, setup="Same edit", types=["One-Liner"], base_version=1
    )
    again = put_bit(
        alice, bit_id, topic_id=topic, setup="Same edit", types=["one-liner"], base_version=1
    )
    assert first.status_code == again.status_code == 200


def test_a_save_without_a_version_is_not_checked(alice: TestClient) -> None:
    bit_id = str(uuid.uuid4())
    topic = random_topic_id(alice)
    put_bit(alice, bit_id, topic_id=topic)
    put_bit(alice, bit_id, topic_id=topic, setup="Second", base_version=1)
    assert put_bit(alice, bit_id, topic_id=topic, setup="Keep mine").status_code == 200
