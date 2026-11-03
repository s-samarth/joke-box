"""Sets and premises go to the Trash too, and come back as they were. Everything is made up."""

import uuid
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.models import Premise, Setlist
from app.models.base import utcnow
from tests.test_jokes import put_joke
from tests.test_premises import new_topic, premise_of, put_premise
from tests.test_trash import trash


def put_set(client: TestClient, set_id: str, *joke_ids: str) -> dict[str, object]:
    items = [{"joke_id": j, "duration_seconds": 60} for j in joke_ids]
    body = {"name": "Fake Friday set", "venue_name": "Fake Garage", "items": items}
    response = client.put(f"/api/setlists/{set_id}", json=body)
    assert response.status_code == 200, response.text
    return response.json()


def test_a_deleted_set_waits_in_the_trash_and_comes_back_whole(alice: TestClient) -> None:
    a, b = put_joke(alice, setup="Fake one").json()["id"], put_joke(alice).json()["id"]
    set_id = str(uuid.uuid4())
    saved = put_set(alice, set_id, b, a)
    assert alice.delete(f"/api/setlists/{set_id}").status_code == 204
    assert alice.delete(f"/api/setlists/{set_id}").status_code == 204  # a replay is fine
    assert alice.get("/api/setlists").json() == []
    [item] = trash(alice)
    assert (item["kind"], item["title"], item["detail"]) == ("sets", "Fake Friday set", "2 jokes")
    assert alice.put(f"/api/setlists/{set_id}", json={"name": "Late"}).status_code == 410
    assert alice.post(f"/api/trash/sets/{set_id}/restore").status_code == 204
    [back] = alice.get("/api/setlists").json()
    assert [i["joke_id"] for i in back["items"]] == [b, a]
    assert back["venue_name"] == saved["venue_name"]


def test_a_set_in_the_trash_can_be_erased(alice: TestClient) -> None:
    set_id = str(uuid.uuid4())
    put_set(alice, set_id, put_joke(alice).json()["id"])
    alice.delete(f"/api/setlists/{set_id}")
    assert alice.delete(f"/api/trash/sets/{set_id}").status_code == 204
    assert trash(alice) == []
    assert alice.post(f"/api/trash/sets/{set_id}/restore").status_code == 404
    assert len(alice.get("/api/jokes").json()) == 1  # its jokes stay in the library


def test_a_deleted_premise_sets_its_jokes_loose_until_it_comes_back(alice: TestClient) -> None:
    topic = new_topic(alice, "Fake")
    premise = put_premise(alice, topic, take="Fake take\nmore").json()
    other = put_premise(alice, topic, take="Fake other").json()
    for setup in ("Fake stays", "Fake moves"):
        put_joke(alice, setup=setup, premise_id=premise["id"])
    assert alice.delete(f"/api/premises/{premise['id']}").status_code == 204
    assert [p["id"] for p in alice.get("/api/premises").json()] == [other["id"]]
    assert premise_of(alice) == {"Fake stays": None, "Fake moves": None}
    [item] = trash(alice)
    assert (item["kind"], item["title"]) == ("premises", "Fake take")
    assert item["detail"] == "2 jokes go back on it"
    # Meanwhile one joke goes on another premise, and a late save can't land on this one.
    moved = next(j for j in alice.get("/api/jokes").json() if j["setup"] == "Fake moves")
    put_joke(alice, moved["id"], setup="Fake moves", premise_id=other["id"])
    put_joke(alice, setup="Fake late", premise_id=premise["id"])
    assert premise_of(alice)["Fake late"] is None
    edit = put_premise(alice, topic, premise["id"], take="Edited")
    assert edit.status_code == 410
    assert alice.post(f"/api/trash/premises/{premise['id']}/restore").status_code == 204
    assert premise_of(alice) == {
        "Fake stays": premise["id"],
        "Fake moves": other["id"],
        "Fake late": None,
    }


def test_sets_and_premises_are_erased_after_30_days(alice: TestClient, db: Session) -> None:
    premise = put_premise(alice, new_topic(alice, "Fake")).json()
    set_id = str(uuid.uuid4())
    put_set(alice, set_id, put_joke(alice).json()["id"])
    alice.delete(f"/api/premises/{premise['id']}")
    alice.delete(f"/api/setlists/{set_id}")
    long_ago = utcnow() - timedelta(days=31)
    for model in (Premise, Setlist):
        db.execute(update(model).values(deleted_at=long_ago))
    db.commit()
    assert trash(alice) == []
    assert alice.post(f"/api/trash/premises/{premise['id']}/restore").status_code == 404


def test_other_users_cannot_trash_my_sets_or_premises(alice: TestClient, bob: TestClient) -> None:
    premise = put_premise(alice, new_topic(alice, "Fake")).json()
    set_id = str(uuid.uuid4())
    put_set(alice, set_id, put_joke(alice).json()["id"])
    assert bob.delete(f"/api/premises/{premise['id']}").status_code == 404
    assert bob.delete(f"/api/setlists/{set_id}").status_code == 404
    alice.delete(f"/api/setlists/{set_id}")
    assert bob.post(f"/api/trash/sets/{set_id}/restore").status_code == 404
    assert trash(bob) == []


def fill_trash(client: TestClient) -> None:
    """One of each kind that needed a lookup per row: a joke with a rewrite, a rewrite of a
    live joke, a set and a show."""
    kept, gone = put_joke(client).json()["id"], put_joke(client).json()["id"]
    rewrites = {joke_id: str(uuid.uuid4()) for joke_id in (kept, gone)}
    for joke_id, rewrite in rewrites.items():
        client.put(f"/api/brainstorms/{rewrite}", json={"joke_id": joke_id, "title": "Fake"})
    client.delete(f"/api/brainstorms/{rewrites[kept]}")  # a live joke's rewrite, on its own
    client.delete(f"/api/jokes/{gone}")  # with its rewrite
    set_id = str(uuid.uuid4())
    put_set(client, set_id, kept)
    client.delete(f"/api/setlists/{set_id}")
    log_id = str(uuid.uuid4())
    show = {"performed_at": "2026-10-01T20:00:00Z", "venue_name": "Fake Venue", "minutes": 5}
    assert client.put(f"/api/logs/{log_id}", json=show).status_code == 200
    client.delete(f"/api/logs/{log_id}")


def test_the_trash_asks_the_same_few_questions_however_full(
    alice: TestClient, queries: list[str]
) -> None:
    fill_trash(alice)
    queries.clear()
    first = trash(alice)
    asked = len(queries)
    for _ in range(3):
        fill_trash(alice)
    queries.clear()
    assert len(trash(alice)) == 4 * len(first)
    assert len(queries) == asked
