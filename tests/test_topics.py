"""Topics, subtopics and types: renames and deletes that affect many bits."""

import uuid

from fastapi.testclient import TestClient

from tests.conftest import random_topic_id
from tests.test_bits import put_bit


def make_topic(client: TestClient, name: str) -> dict:  # type: ignore[type-arg]
    response = client.post("/api/topics", json={"name": name})
    assert response.status_code == 201
    return response.json()  # type: ignore[no-any-return]


def test_topic_names_are_unique_case_insensitively(alice: TestClient) -> None:
    make_topic(alice, "Dating")
    assert alice.post("/api/topics", json={"name": "dating"}).status_code == 409


def test_random_is_protected(alice: TestClient) -> None:
    random_id = random_topic_id(alice)
    assert alice.patch(f"/api/topics/{random_id}", json={"name": "Misc"}).status_code == 400
    assert alice.delete(f"/api/topics/{random_id}").status_code == 400


def test_rename_topic_keeps_its_bits(alice: TestClient) -> None:
    topic = make_topic(alice, "Dating")
    bit = put_bit(alice, topic_id=topic["id"]).json()
    alice.patch(f"/api/topics/{topic['id']}", json={"name": "Love"})
    assert alice.get(f"/api/bits/{bit['id']}").json()["topic_id"] == topic["id"]
    assert "Love" in [t["name"] for t in alice.get("/api/topics").json()]


def test_delete_topic_moves_bits_to_random(alice: TestClient) -> None:
    topic = make_topic(alice, "Dating")
    sub = alice.post(f"/api/topics/{topic['id']}/subtopics", json={"name": "Apps"}).json()
    bit = put_bit(alice, topic_id=topic["id"], subtopic_id=sub["id"]).json()
    assert alice.delete(f"/api/topics/{topic['id']}").status_code == 204
    moved = alice.get(f"/api/bits/{bit['id']}").json()
    assert moved["topic_id"] == random_topic_id(alice)
    assert moved["subtopic_id"] is None


def test_delete_subtopic_clears_it_from_bits(alice: TestClient) -> None:
    topic = make_topic(alice, "Food")
    sub = alice.post(f"/api/topics/{topic['id']}/subtopics", json={"name": "Cooking"}).json()
    bit = put_bit(alice, topic_id=topic["id"], subtopic_id=sub["id"]).json()
    alice.delete(f"/api/subtopics/{sub['id']}")
    after = alice.get(f"/api/bits/{bit['id']}").json()
    assert (after["topic_id"], after["subtopic_id"]) == (topic["id"], None)


def test_subtopic_must_belong_to_topic(alice: TestClient) -> None:
    food = make_topic(alice, "Food")
    sub = alice.post(f"/api/topics/{food['id']}/subtopics", json={"name": "Cooking"}).json()
    assert put_bit(alice, subtopic_id=sub["id"]).status_code == 422


def test_type_names_match_case_insensitively(alice: TestClient) -> None:
    put_bit(alice, types=["One-liner"])
    put_bit(alice, types=["One-Liner"])
    assert [t["name"] for t in alice.get("/api/types").json()] == ["One-liner"]


def test_rename_type(alice: TestClient) -> None:
    bit = put_bit(alice, types=["One-liner"]).json()
    type_id = alice.get("/api/types").json()[0]["id"]
    alice.patch(f"/api/types/{type_id}", json={"name": "Quickie"})
    assert alice.get(f"/api/bits/{bit['id']}").json()["types"] == ["Quickie"]


def test_rename_type_onto_existing_merges(alice: TestClient) -> None:
    a = put_bit(alice, types=["Opener"]).json()
    b = put_bit(alice, types=["Opener", "Story"]).json()
    opener_id = next(t["id"] for t in alice.get("/api/types").json() if t["name"] == "Opener")
    alice.patch(f"/api/types/{opener_id}", json={"name": "story"})
    assert [t["name"] for t in alice.get("/api/types").json()] == ["Story"]
    assert alice.get(f"/api/bits/{a['id']}").json()["types"] == ["Story"]
    assert alice.get(f"/api/bits/{b['id']}").json()["types"] == ["Story"]


def test_delete_type_leaves_bits_undefined(alice: TestClient) -> None:
    bit = put_bit(alice, types=["Roast"]).json()
    type_id = alice.get("/api/types").json()[0]["id"]
    alice.delete(f"/api/types/{type_id}")
    assert alice.get(f"/api/bits/{bit['id']}").json()["types"] == []


def test_other_users_cannot_edit_my_topics(alice: TestClient, bob: TestClient) -> None:
    topic = make_topic(alice, "Mine")
    assert bob.patch(f"/api/topics/{topic['id']}", json={"name": "x"}).status_code == 404
    assert bob.delete(f"/api/topics/{topic['id']}").status_code == 404
    assert bob.post(f"/api/topics/{topic['id']}/subtopics", json={"name": "x"}).status_code == 404
    assert bob.patch(f"/api/types/{uuid.uuid4()}", json={"name": "x"}).status_code == 404
