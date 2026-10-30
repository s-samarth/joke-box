"""Premises: filed under a topic, holding jokes from any topic."""

import uuid
from typing import Any

from fastapi.testclient import TestClient

from tests.test_jokes import put_joke


def new_topic(client: TestClient, name: str) -> str:
    return str(client.post("/api/topics", json={"name": name}).json()["id"])


def put_premise(
    client: TestClient, topic_id: str, premise_id: str | None = None, **fields: Any
) -> Any:
    premise_id = premise_id or str(uuid.uuid4())
    body = {"topic_id": topic_id, "take": "Fake take", **fields}
    return client.put(f"/api/premises/{premise_id}", json=body)


def premise_of(client: TestClient) -> dict[str, str | None]:
    return {j["setup"]: j["premise_id"] for j in client.get("/api/jokes").json()}


def test_create_edit_and_list(alice: TestClient) -> None:
    topic = new_topic(alice, "Fake family")
    pid = str(uuid.uuid4())
    assert put_premise(alice, topic, pid, take="  Fake take  ").json()["take"] == "Fake take"
    put_premise(alice, topic, pid, take="Fake take, edited", notes="Fake because")
    put_premise(alice, topic, pid, take="Fake take, edited", notes="Fake because")  # a retry
    listed = alice.get("/api/premises").json()
    assert [(p["take"], p["notes"]) for p in listed] == [("Fake take, edited", "Fake because")]


def test_a_take_is_required(alice: TestClient) -> None:
    assert put_premise(alice, new_topic(alice, "Fake"), take="   ").status_code == 422


def test_a_joke_from_any_topic_can_rest_on_it(alice: TestClient) -> None:
    premise = put_premise(alice, new_topic(alice, "Fake family")).json()
    joke = put_joke(alice, setup="Fake random joke", premise_id=premise["id"])
    assert joke.status_code == 200
    assert premise_of(alice) == {"Fake random joke": premise["id"]}


def test_an_older_app_leaves_the_link_alone(alice: TestClient) -> None:
    premise = put_premise(alice, new_topic(alice, "Fake")).json()
    joke = put_joke(alice, setup="Fake joke", premise_id=premise["id"]).json()
    put_joke(alice, joke["id"], setup="Fake joke")
    assert premise_of(alice)["Fake joke"] == premise["id"]
    put_joke(alice, joke["id"], setup="Fake joke", premise_id=None)
    assert premise_of(alice)["Fake joke"] is None


def test_deleting_it_keeps_the_jokes(alice: TestClient) -> None:
    premise = put_premise(alice, new_topic(alice, "Fake")).json()
    put_joke(alice, setup="Fake joke", premise_id=premise["id"])
    assert alice.delete(f"/api/premises/{premise['id']}").status_code == 204
    assert premise_of(alice) == {"Fake joke": None}
    # A save made offline before the delete drops the link instead of failing.
    assert put_joke(alice, setup="Fake late save", premise_id=premise["id"]).status_code == 200
    assert premise_of(alice)["Fake late save"] is None


def test_deleting_its_topic_moves_it_to_random(alice: TestClient) -> None:
    topic = new_topic(alice, "Fake doomed")
    premise = put_premise(alice, topic).json()
    alice.delete(f"/api/topics/{topic}")
    random_id = next(t["id"] for t in alice.get("/api/topics").json() if t["is_system"])
    assert alice.get("/api/premises").json()[0]["topic_id"] == random_id
    assert premise["id"] == alice.get("/api/premises").json()[0]["id"]


def test_other_peoples_premises_and_topics_are_off_limits(
    alice: TestClient, bob: TestClient
) -> None:
    theirs = put_premise(bob, new_topic(bob, "Fake")).json()
    assert put_joke(alice, premise_id=theirs["id"]).status_code == 422
    assert put_premise(alice, new_topic(alice, "Fake"), theirs["id"]).status_code == 404
    assert alice.delete(f"/api/premises/{theirs['id']}").status_code == 404
    assert put_premise(alice, new_topic(bob, "Fake bob")).status_code == 422
    assert alice.get("/api/premises").json() == []
