"""Craft areas and kinds: everyone starts with some, and they're yours to change. Made-up notes."""

import uuid

from fastapi.testclient import TestClient

from tests.test_craft import areas, kind_id, kinds, note_in


def test_everyone_starts_with_areas_they_can_change(alice: TestClient) -> None:
    start = areas(alice)
    assert [a["name"] for a in start][:2] == ["Writing", "Generating"]
    assert len(areas(alice)) == len(start)  # asking again makes no more
    made = alice.post("/api/craft-areas", json={"name": "Fake area", "color": "teal"}).json()
    assert made["position"] == len(start)
    clash = alice.post("/api/craft-areas", json={"name": "fake AREA"})
    assert clash.status_code == 409
    renamed = alice.patch(
        f"/api/craft-areas/{made['id']}",
        json={"name": "Fake renamed", "color": "rose", "screens": ["stage", "stage"]},
    ).json()
    assert renamed["name"] == "Fake renamed" and renamed["screens"] == ["stage"]
    assert alice.post("/api/craft-areas", json={"name": "x", "color": "beige"}).status_code == 422


def test_reorder_and_delete_an_area_keeps_its_notes(alice: TestClient) -> None:
    first, second = areas(alice)[:2]
    note_id = str(uuid.uuid4())
    alice.put(f"/api/craft-notes/{note_id}", json=note_in(alice) | {"area_id": first["id"]})
    alice.put("/api/craft-areas/order", json={"ids": [second["id"], first["id"]]})
    assert areas(alice)[0]["id"] == second["id"]
    alice.delete(f"/api/craft-areas/{first['id']}", params={"move_to": second["id"]})
    assert alice.get("/api/craft-notes").json()[0]["area_id"] == second["id"]


def test_the_last_area_cannot_go(alice: TestClient) -> None:
    for area in areas(alice)[1:]:
        assert alice.delete(f"/api/craft-areas/{area['id']}").status_code == 204
    assert alice.delete(f"/api/craft-areas/{areas(alice)[0]['id']}").status_code == 400


def test_areas_are_private(alice: TestClient, bob: TestClient) -> None:
    mine = areas(alice)[0]
    change = {"name": "Fake"}
    assert bob.patch(f"/api/craft-areas/{mine['id']}", json=change).status_code == 404
    assert bob.delete(f"/api/craft-areas/{mine['id']}").status_code == 404
    theirs = areas(bob)[0]["id"]
    bob_area = alice.delete(f"/api/craft-areas/{mine['id']}", params={"move_to": theirs})
    assert bob_area.status_code == 404


def test_kinds_are_yours_to_change(alice: TestClient, bob: TestClient) -> None:
    assert [k["behaviour"] for k in kinds(alice)] == ["checklist", "technique", "reference", "path"]
    made = alice.post("/api/craft-kinds", json={"name": "Fake exercise", "behaviour": "technique"})
    exercise = made.json()
    assert exercise["position"] == 4
    assert alice.post("/api/craft-kinds", json={"name": "fake EXERCISE"}).status_code == 409
    assert (
        alice.post("/api/craft-kinds", json={"name": "x", "behaviour": "poem"}).status_code == 422
    )
    note_id = str(uuid.uuid4())
    body = note_in(alice) | {"kind_id": exercise["id"]}
    assert alice.put(f"/api/craft-notes/{note_id}", json=body).json()["behaviour"] == "technique"
    # Changing the kind's behaviour changes how its notes behave.
    alice.patch(f"/api/craft-kinds/{exercise['id']}", json={"name": "Fake", "behaviour": "path"})
    assert alice.get("/api/craft-notes").json()[0]["behaviour"] == "path"
    assert bob.delete(f"/api/craft-kinds/{exercise['id']}").status_code == 404
    reference = kind_id(alice, "reference")
    alice.delete(f"/api/craft-kinds/{exercise['id']}", params={"move_to": str(reference)})
    assert alice.get("/api/craft-notes").json()[0]["kind_id"] == reference


def test_the_last_kind_cannot_go(alice: TestClient) -> None:
    for kind in kinds(alice)[1:]:
        assert alice.delete(f"/api/craft-kinds/{kind['id']}").status_code == 204
    assert alice.delete(f"/api/craft-kinds/{kinds(alice)[0]['id']}").status_code == 400


def test_area_colours_are_presets_or_hex(alice: TestClient) -> None:
    ok = alice.post("/api/craft-areas", json={"name": "Fake hex", "color": "#4fa3e0"})
    assert ok.json()["color"] == "#4fa3e0"
    assert (
        alice.post("/api/craft-areas", json={"name": "Fake lime", "color": "lime"}).status_code
        == 201
    )
    assert (
        alice.post("/api/craft-areas", json={"name": "Fake bad", "color": "#12"}).status_code == 422
    )
