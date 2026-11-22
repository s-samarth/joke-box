"""Putting a Craft area's notes in your own order. The notes are made up."""

import uuid

from fastapi.testclient import TestClient

from tests.test_craft import areas, note_in


def add(client: TestClient, title: str, position: int, index: int = 0) -> str:
    note_id = str(uuid.uuid4())
    body = note_in(client, index) | {"title": title, "position": position}
    client.put(f"/api/craft-notes/{note_id}", json=body)
    return note_id


def titles(client: TestClient, area_id: object) -> list[str]:
    return [n["title"] for n in client.get("/api/craft-notes").json() if n["area_id"] == area_id]


def test_reorder_an_areas_notes(alice: TestClient) -> None:
    area = areas(alice)[0]["id"]
    a, b, c = add(alice, "Fake A", 0), add(alice, "Fake B", 1), add(alice, "Fake C", 2)
    before = {n["id"]: n["version"] for n in alice.get("/api/craft-notes").json()}
    answer = alice.put(f"/api/craft-areas/{area}/notes/order", json={"ids": [c, a, b]})
    assert answer.status_code == 204
    assert titles(alice, area) == ["Fake C", "Fake A", "Fake B"]
    after = {n["id"]: n["version"] for n in alice.get("/api/craft-notes").json()}
    assert after == before  # a note's place isn't an edit, so no version moves


def test_notes_left_out_keep_their_order_after(alice: TestClient) -> None:
    area = areas(alice)[0]["id"]
    a, _b, c = add(alice, "Fake A", 0), add(alice, "Fake B", 1), add(alice, "Fake C", 2)
    alice.put(f"/api/craft-areas/{area}/notes/order", json={"ids": [c, a]})
    assert titles(alice, area) == ["Fake C", "Fake A", "Fake B"]


def test_only_this_areas_notes_move(alice: TestClient) -> None:
    first, second = areas(alice)[0]["id"], areas(alice)[1]["id"]
    a = add(alice, "Fake A", 0)
    elsewhere = add(alice, "Fake elsewhere", 5, index=1)
    alice.put(f"/api/craft-areas/{first}/notes/order", json={"ids": [elsewhere, a]})
    other = next(n for n in alice.get("/api/craft-notes").json() if n["id"] == elsewhere)
    assert (other["area_id"], other["position"]) == (second, 5)


def test_someone_elses_area_cannot_be_reordered(alice: TestClient, bob: TestClient) -> None:
    area = areas(alice)[0]["id"]
    a = add(alice, "Fake A", 3)
    answer = bob.put(f"/api/craft-areas/{area}/notes/order", json={"ids": [a]})
    assert answer.status_code == 404
    assert next(n for n in alice.get("/api/craft-notes").json() if n["id"] == a)["position"] == 3
