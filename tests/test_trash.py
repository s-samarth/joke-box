"""The Trash: deleting moves things there for 30 days; they can be put back or erased."""

import uuid
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.models import Joke
from app.models.base import utcnow
from tests.test_jokes import put_joke


def joke(client: TestClient, setup: str = "Fake setup") -> str:
    joke_id = str(uuid.uuid4())
    assert put_joke(client, joke_id, setup=setup).status_code == 200
    return joke_id


def trash(client: TestClient) -> list[dict[str, str]]:
    response = client.get("/api/trash")
    assert response.status_code == 200
    return response.json()


def test_a_deleted_joke_waits_in_the_trash_with_its_rewrites(alice: TestClient) -> None:
    joke_id = joke(alice, "Fake setup\nsecond line")
    alice.put(
        f"/api/brainstorms/{uuid.uuid4()}", json={"joke_id": joke_id, "title": "Fake rewrite"}
    )
    assert alice.delete(f"/api/jokes/{joke_id}").status_code == 204
    assert alice.delete(f"/api/jokes/{joke_id}").status_code == 204  # a replayed delete is fine
    assert alice.get("/api/jokes").json() == []
    assert alice.get(f"/api/jokes/{joke_id}").status_code == 404
    assert alice.get("/api/brainstorms").json() == []
    [item] = trash(alice)  # the rewrite goes with its joke, not on its own
    assert (item["kind"], item["id"], item["title"]) == ("jokes", joke_id, "Fake setup")
    assert item["detail"] == "With 1 rewrite"

    assert alice.post(f"/api/trash/jokes/{joke_id}/restore").status_code == 204
    assert [b["id"] for b in alice.get("/api/jokes").json()] == [joke_id]
    assert len(alice.get("/api/brainstorms").json()) == 1
    assert trash(alice) == []


def test_sets_keep_a_trashed_jokes_place(alice: TestClient) -> None:
    first, gone, last = joke(alice), joke(alice), joke(alice)
    set_id = str(uuid.uuid4())
    items = [{"joke_id": b} for b in (first, gone, last)]
    alice.put(f"/api/setlists/{set_id}", json={"name": "Fake set", "items": items})
    alice.delete(f"/api/jokes/{gone}")
    [shown] = alice.get("/api/setlists").json()
    assert [i["joke_id"] for i in shown["items"]] == [first, last]
    # The app saves the set without it (reordered); its place is kept for when it comes back.
    reordered = [{"joke_id": last}, {"joke_id": first}]
    alice.put(f"/api/setlists/{set_id}", json={"name": "Fake set", "items": reordered})
    alice.post(f"/api/trash/jokes/{gone}/restore")
    [back] = alice.get("/api/setlists").json()
    assert [i["joke_id"] for i in back["items"]] == [last, gone, first]


def test_editing_something_in_the_trash_is_refused(alice: TestClient) -> None:
    joke_id = joke(alice)
    alice.delete(f"/api/jokes/{joke_id}")
    response = put_joke(alice, joke_id, setup="Edited on another device")
    assert response.status_code == 410
    assert "Trash" in response.json()["detail"]


def test_delete_forever_and_empty(alice: TestClient) -> None:
    one, two = joke(alice), joke(alice)
    note_id = str(uuid.uuid4())
    alice.put(f"/api/observations/{note_id}", json={"text": "Fake observation"})
    for url in (f"/api/jokes/{one}", f"/api/jokes/{two}", f"/api/observations/{note_id}"):
        alice.delete(url)
    assert {i["kind"] for i in trash(alice)} == {"jokes", "observations"}
    assert alice.delete(f"/api/trash/jokes/{one}").status_code == 204
    assert alice.post(f"/api/trash/jokes/{one}/restore").status_code == 404
    assert len(trash(alice)) == 2
    assert alice.delete("/api/trash").status_code == 204
    assert trash(alice) == []


def test_only_live_things_can_be_erased(alice: TestClient) -> None:
    joke_id = joke(alice)
    assert alice.delete(f"/api/trash/jokes/{joke_id}").status_code == 204
    assert len(alice.get("/api/jokes").json()) == 1  # not in the Trash, so left alone
    assert alice.post(f"/api/trash/nonsense/{joke_id}/restore").status_code == 404


def test_things_are_erased_after_30_days(alice: TestClient, db: Session) -> None:
    old, recent = joke(alice), joke(alice)
    alice.delete(f"/api/jokes/{old}")
    alice.delete(f"/api/jokes/{recent}")
    long_ago = utcnow() - timedelta(days=31)
    db.execute(update(Joke).where(Joke.id == uuid.UUID(old)).values(deleted_at=long_ago))
    db.commit()
    [left] = trash(alice)
    assert left["id"] == recent
    assert alice.post(f"/api/trash/jokes/{old}/restore").status_code == 404


def test_other_users_cannot_touch_my_trash(alice: TestClient, bob: TestClient) -> None:
    joke_id = joke(alice)
    assert bob.delete(f"/api/jokes/{joke_id}").status_code == 404
    alice.delete(f"/api/jokes/{joke_id}")
    assert trash(bob) == []
    assert bob.post(f"/api/trash/jokes/{joke_id}/restore").status_code == 404
    bob.delete(f"/api/trash/jokes/{joke_id}")
    bob.delete("/api/trash")
    assert len(trash(alice)) == 1


def test_a_set_saved_offline_with_a_trashed_joke_still_saves(alice: TestClient) -> None:
    keep, gone = joke(alice), joke(alice)
    set_id = str(uuid.uuid4())
    body = {"name": "Fake set", "items": [{"joke_id": gone}, {"joke_id": keep}]}
    alice.put(f"/api/setlists/{set_id}", json=body)
    alice.delete(f"/api/jokes/{gone}")  # on another device
    assert alice.put(f"/api/setlists/{set_id}", json=body).status_code == 200  # the stale save
    alice.post(f"/api/trash/jokes/{gone}/restore")
    [back] = alice.get("/api/setlists").json()
    assert [i["joke_id"] for i in back["items"]] == [gone, keep]
