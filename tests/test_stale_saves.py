"""Saves that waited (offline, or on a second device) while something they name changed.

They must neither bring back what was renamed, merged or deleted, nor be refused for good.
The material is made up.
"""

import uuid
from typing import Any

from fastapi.testclient import TestClient

from tests.conftest import random_topic_id
from tests.test_clusters import lead, new, put_cluster
from tests.test_craft import areas, note_in
from tests.test_jokes import put_joke


def names(client: TestClient, path: str) -> list[str]:
    return [row["name"] for row in client.get(path).json()]


def joke(client: TestClient, joke_id: str) -> dict[str, Any]:
    return dict(client.get(f"/api/jokes/{joke_id}").json())


def test_a_save_from_before_a_status_rename_clashes(alice: TestClient) -> None:
    joke_id = str(uuid.uuid4())
    saved = put_joke(alice, joke_id, status="Workshop").json()
    sid = next(s["id"] for s in alice.get("/api/statuses").json() if s["name"] == "Workshop")
    alice.patch(f"/api/statuses/{sid}", json={"name": "Tight"})
    stale = put_joke(
        alice, joke_id, status="Workshop", setup="Fake edit", base_version=saved["version"]
    )
    assert stale.status_code == 409
    assert "Workshop" not in names(alice, "/api/statuses")


def test_a_save_from_before_a_type_merge_clashes(alice: TestClient) -> None:
    joke_id = str(uuid.uuid4())
    saved = put_joke(alice, joke_id, types=["Fake one"]).json()
    put_joke(alice, types=["Fake two"])
    tid = next(t["id"] for t in alice.get("/api/types").json() if t["name"] == "Fake one")
    alice.patch(f"/api/types/{tid}", json={"name": "Fake two"})
    stale = put_joke(alice, joke_id, types=["Fake one"], base_version=saved["version"])
    assert stale.status_code == 409
    assert "Fake one" not in names(alice, "/api/types")


def test_a_set_saved_before_its_venue_moved_clashes(alice: TestClient) -> None:
    set_id = str(uuid.uuid4())
    body = {"name": "Fake set", "target_seconds": 300, "venue_name": "Fake Cellar", "items": []}
    saved = alice.put(f"/api/setlists/{set_id}", json=body).json()
    alice.put(f"/api/setlists/{uuid.uuid4()}", json={**body, "venue_name": "Fake Attic"})
    venues = {v["name"]: v["id"] for v in alice.get("/api/venues").json()}
    gone = venues["Fake Cellar"]
    assert alice.delete(f"/api/venues/{gone}?move_to={venues['Fake Attic']}").status_code == 204
    stale = alice.put(f"/api/setlists/{set_id}", json={**body, "base_version": saved["version"]})
    assert stale.status_code == 409
    assert "Fake Cellar" not in names(alice, "/api/venues")


def test_a_save_naming_a_deleted_topic_goes_to_random(alice: TestClient) -> None:
    topic = alice.post("/api/topics", json={"name": "Fake buses"}).json()
    joke_id = str(uuid.uuid4())
    saved = put_joke(alice, joke_id, topic_id=topic["id"]).json()
    assert alice.delete(f"/api/topics/{topic['id']}").status_code == 204
    late = put_joke(
        alice, joke_id, topic_id=topic["id"], setup="Fake edit", version=saved["version"]
    )
    assert late.status_code == 200
    assert late.json()["topic_id"] == random_topic_id(alice)
    assert late.json()["subtopic_id"] is not None  # Random's Subtopic unknown


def test_a_save_naming_a_deleted_subtopic_goes_to_subtopic_unknown(alice: TestClient) -> None:
    topic = alice.post("/api/topics", json={"name": "Fake trains"}).json()
    sub = alice.post(f"/api/topics/{topic['id']}/subtopics", json={"name": "Fake delays"}).json()
    joke_id = str(uuid.uuid4())
    put_joke(alice, joke_id, topic_id=topic["id"], subtopic_id=sub["id"])
    moved_to = joke(alice, joke_id)
    assert alice.delete(f"/api/subtopics/{sub['id']}").status_code == 204
    after = joke(alice, joke_id)
    assert after["updated_at"] == moved_to["updated_at"]  # a move isn't an edit
    late = put_joke(alice, joke_id, topic_id=topic["id"], subtopic_id=sub["id"], setup="Fake edit")
    assert late.status_code == 200 and late.json()["subtopic_id"] == after["subtopic_id"]


def test_a_note_saved_after_its_area_went_stays_where_it_was_moved(alice: TestClient) -> None:
    gone, kept = areas(alice)[0]["id"], areas(alice)[1]["id"]
    note_id = str(uuid.uuid4())
    body = note_in(alice, 0) | {"title": "Fake note"}
    alice.put(f"/api/craft-notes/{note_id}", json=body)
    assert alice.delete(f"/api/craft-areas/{gone}?move_to={kept}").status_code == 204
    late = alice.put(f"/api/craft-notes/{note_id}", json=body | {"title": "Fake edit"})
    assert late.status_code == 200 and late.json()["area_id"] == kept


def test_an_edit_from_an_old_copy_keeps_a_notes_place(alice: TestClient) -> None:
    area = areas(alice)[0]["id"]
    ids = [str(uuid.uuid4()) for _ in range(2)]
    for position, note_id in enumerate(ids):
        body = note_in(alice) | {"title": f"Fake {position}", "position": position}
        alice.put(f"/api/craft-notes/{note_id}", json=body)
    alice.put(f"/api/craft-areas/{area}/notes/order", json={"ids": ids[::-1]})
    old_copy = note_in(alice) | {"title": "Fake 0 edited", "position": 0}
    alice.put(f"/api/craft-notes/{ids[0]}", json=old_copy)
    order = [n["id"] for n in alice.get("/api/craft-notes").json() if n["area_id"] == area]
    assert order == ids[::-1]


def test_a_lead_picked_from_an_old_list_is_ignored(alice: TestClient) -> None:
    cid, (first, second) = new(alice, "Fake one", "Fake two")
    put_joke(alice, second, setup="Fake two", cluster_id=None)  # taken out on another device
    put_cluster(alice, cid, lead_joke_id=second)  # Make lead, from a list from before
    assert lead(alice, cid) == first
