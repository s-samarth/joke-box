"""Craft notes and areas: saving, ordering, kinds, editable areas, links, and privacy.

The notes here are made up; real craft notes never go into tests.
"""

import uuid

from fastapi.testclient import TestClient

BASE = {"title": "Fake checklist", "body": "- Fake item one\n- Fake item two", "kind": "checklist"}


def areas(client: TestClient) -> list[dict[str, object]]:
    return list(client.get("/api/craft-areas").json())


def note_in(client: TestClient, index: int = 0) -> dict[str, object]:
    """The fake note, filed in one of the client's own areas."""
    return BASE | {"area_id": areas(client)[index]["id"]}


def test_save_and_edit_a_note(alice: TestClient) -> None:
    note_id, rewriting = str(uuid.uuid4()), areas(alice)[2]["id"]
    saved = alice.put(f"/api/craft-notes/{note_id}", json=note_in(alice, 2)).json()
    assert saved["kind"] == "checklist" and saved["area_id"] == rewriting
    edited = alice.put(f"/api/craft-notes/{note_id}", json=note_in(alice) | {"body": "Fake"}).json()
    assert edited["body"] == "Fake" and edited["area_id"] != rewriting
    assert alice.delete(f"/api/craft-notes/{note_id}").status_code == 204
    assert alice.delete(f"/api/craft-notes/{note_id}").status_code == 204  # replayed delete
    assert alice.get("/api/craft-notes").json() == []


def test_notes_come_back_in_position_order(alice: TestClient) -> None:
    for position, title in [(2, "Fake B"), (1, "Fake A")]:
        body = note_in(alice) | {"title": title, "position": position}
        alice.put(f"/api/craft-notes/{uuid.uuid4()}", json=body)
    assert [n["title"] for n in alice.get("/api/craft-notes").json()] == ["Fake A", "Fake B"]


def test_created_at_is_kept_on_create_only(alice: TestClient) -> None:
    note_id = str(uuid.uuid4())
    body = note_in(alice) | {"created_at": "2023-07-04T12:00:00+05:30"}
    first = alice.put(f"/api/craft-notes/{note_id}", json=body).json()
    assert first["created_at"].startswith("2023-07-04")
    later = alice.put(
        f"/api/craft-notes/{note_id}", json=note_in(alice) | {"created_at": None}
    ).json()
    assert later["created_at"].startswith("2023-07-04")


def test_kinds_areas_titles_and_links_are_checked(alice: TestClient) -> None:
    bad = [
        note_in(alice) | {"kind": "poem"},
        note_in(alice) | {"title": "  "},
        note_in(alice) | {"url": "javascript:alert(1)"},
    ]
    for body in bad:
        assert alice.put(f"/api/craft-notes/{uuid.uuid4()}", json=body).status_code == 422
    missing_area = note_in(alice) | {"area_id": str(uuid.uuid4())}
    assert alice.put(f"/api/craft-notes/{uuid.uuid4()}", json=missing_area).status_code == 404
    tags = alice.put(
        f"/api/craft-notes/{uuid.uuid4()}", json=note_in(alice) | {"hashtags": [" #a ", ""]}
    )
    assert tags.json()["hashtags"] == ["#a"]


def test_other_users_cannot_see_or_change(alice: TestClient, bob: TestClient) -> None:
    note_id = str(uuid.uuid4())
    alice.put(f"/api/craft-notes/{note_id}", json=note_in(alice))
    assert bob.get("/api/craft-notes").json() == []
    assert bob.put(f"/api/craft-notes/{note_id}", json=note_in(bob)).status_code == 404
    # Nor file his own note in Alice's area.
    assert bob.put(f"/api/craft-notes/{uuid.uuid4()}", json=note_in(alice)).status_code == 404
    bob.delete(f"/api/craft-notes/{note_id}")
    assert len(alice.get("/api/craft-notes").json()) == 1


def test_a_brainstorm_session_can_run_a_technique(alice: TestClient, bob: TestClient) -> None:
    note_id, session_id = str(uuid.uuid4()), str(uuid.uuid4())
    alice.put(f"/api/craft-notes/{note_id}", json=note_in(alice) | {"kind": "technique"})
    body = {"title": "Fake session", "technique_id": note_id}
    assert alice.put(f"/api/sessions/{session_id}", json=body).json()["technique_id"] == note_id
    # Bob can't run Alice's technique.
    assert bob.put(f"/api/sessions/{uuid.uuid4()}", json=body).status_code == 404
    # Deleting the note keeps the session, just unlinked.
    alice.delete(f"/api/craft-notes/{note_id}")
    assert alice.get("/api/sessions").json()[0]["technique_id"] is None


def test_lessons_point_at_their_show_or_analysis(alice: TestClient, bob: TestClient) -> None:
    log_id, analysis_id, note_id = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
    alice.put(f"/api/logs/{log_id}", json={"performed_at": "2026-10-20T21:00:00+05:30"})
    alice.put(f"/api/analyses/{analysis_id}", json={"title": "Fake set"})
    body = note_in(alice) | {"performance_log_id": log_id, "analysis_id": analysis_id}
    saved = alice.put(f"/api/craft-notes/{note_id}", json=body).json()
    assert saved["performance_log_id"] == log_id and saved["analysis_id"] == analysis_id
    assert bob.put(f"/api/craft-notes/{uuid.uuid4()}", json=body).status_code == 404
    # Deleting the show or the analysis keeps the lesson.
    alice.delete(f"/api/logs/{log_id}")
    alice.delete(f"/api/analyses/{analysis_id}")
    kept = alice.get("/api/craft-notes").json()[0]
    assert kept["performance_log_id"] is None and kept["analysis_id"] is None


def test_a_show_keeps_its_laugh_tally(alice: TestClient) -> None:
    log_id = str(uuid.uuid4())
    show = {"performed_at": "2026-10-20T21:00:00+05:30", "duration_seconds": 300}
    saved = alice.put(f"/api/logs/{log_id}", json=show | {"laughs": [2, 0, 3, 1, 1]}).json()
    assert saved["laughs"] == [2, 0, 3, 1, 1]
    assert alice.put(f"/api/logs/{log_id}", json=show).json()["laughs"] is None
    for bad in ([1, 2], [0, 0, 0, 0, -1]):
        assert alice.put(f"/api/logs/{log_id}", json=show | {"laughs": bad}).status_code == 422


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
    alice.put(f"/api/craft-notes/{note_id}", json=BASE | {"area_id": first["id"]})
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
