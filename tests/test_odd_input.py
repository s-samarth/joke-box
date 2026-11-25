"""Odd input that used to give a 500 or a strange row. The material is made up."""

import uuid

from fastapi.testclient import TestClient

from tests.test_craft import areas
from tests.test_jokes import put_joke


def test_a_nul_character_is_refused_plainly(alice: TestClient) -> None:
    answer = put_joke(alice, setup="Fake\u0000 setup")
    assert answer.status_code == 422 and "NUL" in answer.json()["detail"]


def test_a_venue_of_only_spaces_is_no_venue(alice: TestClient) -> None:
    body = {"name": "Fake set", "target_seconds": 60, "venue_name": "   ", "items": []}
    saved = alice.put(f"/api/setlists/{uuid.uuid4()}", json=body).json()
    assert saved["venue_name"] is None
    assert alice.get("/api/venues").json() == []


def test_a_type_cant_be_renamed_to_undefined(alice: TestClient) -> None:
    put_joke(alice, types=["Fake kind"])
    tid = alice.get("/api/types").json()[0]["id"]
    assert alice.patch(f"/api/types/{tid}", json={"name": "undefined"}).status_code == 422


def test_accented_capitals_find_the_same_status(alice: TestClient) -> None:
    put_joke(alice, status="Écrit")
    assert put_joke(alice, status="écrit").status_code == 200
    names = [s["name"].lower() for s in alice.get("/api/statuses").json()]
    assert names.count("écrit") == 1


def test_a_new_area_goes_at_the_end_after_a_delete(alice: TestClient) -> None:
    first = areas(alice)[0]["id"]
    assert alice.delete(f"/api/craft-areas/{first}").status_code == 204
    alice.post(
        "/api/craft-areas", json={"name": "Fake area", "description": "", "color": "#888888"}
    )
    assert areas(alice)[-1]["name"] == "Fake area"
