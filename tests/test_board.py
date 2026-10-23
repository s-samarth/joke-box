"""Jokes you place by hand on the joke board."""

import uuid

from fastapi.testclient import TestClient

from tests.conftest import random_topic_id
from tests.test_jokes import put_joke


def place(
    client: TestClient, joke_id: str, x: float = 40, y: float = 80, topic_id: str | None = None
) -> int:
    body = {"topic_id": topic_id or random_topic_id(client), "x": x, "y": y}
    return client.put(f"/api/board/{joke_id}", json=body).status_code


def spots(client: TestClient) -> dict[str, tuple[float, float]]:
    return {s["joke_id"]: (s["x"], s["y"]) for s in client.get("/api/board").json()}


def test_place_and_move_a_joke(alice: TestClient) -> None:
    joke = put_joke(alice).json()
    assert place(alice, joke["id"]) == 200
    assert place(alice, joke["id"], x=300, y=12.5) == 200
    assert spots(alice) == {joke["id"]: (300, 12.5)}


def test_moving_a_box_leaves_the_joke_alone(alice: TestClient) -> None:
    joke = put_joke(alice).json()
    place(alice, joke["id"])
    after = next(j for j in alice.get("/api/jokes").json() if j["id"] == joke["id"])
    assert (after["version"], after["updated_at"]) == (joke["version"], joke["updated_at"])


def test_tidy_some_or_all(alice: TestClient) -> None:
    a, b, c = (put_joke(alice).json()["id"] for _ in range(3))
    for joke_id in (a, b, c):
        place(alice, joke_id)
    assert alice.post("/api/board/tidy", json={"joke_ids": [a]}).status_code == 204
    assert set(spots(alice)) == {b, c}
    alice.post("/api/board/tidy", json={})
    assert spots(alice) == {}


def test_only_your_own_jokes(alice: TestClient, bob: TestClient) -> None:
    joke = put_joke(alice).json()["id"]
    place(alice, joke)
    assert place(bob, joke) == 404
    assert place(alice, str(uuid.uuid4())) == 404
    assert spots(bob) == {}
    bob.post("/api/board/tidy", json={"joke_ids": [joke]})
    assert set(spots(alice)) == {joke}


def test_bad_spots_are_refused(alice: TestClient) -> None:
    joke = put_joke(alice).json()["id"]
    assert place(alice, joke, x=-5) == 422
    assert place(alice, joke, y=10**9) == 422


def test_spot_goes_when_the_joke_is_erased(alice: TestClient) -> None:
    joke = put_joke(alice).json()["id"]
    place(alice, joke)
    alice.delete(f"/api/jokes/{joke}")
    alice.delete(f"/api/trash/jokes/{joke}")
    assert spots(alice) == {}
