"""Craft notes: saving, ordering, the fixed kinds and areas, and privacy.

The notes here are made up; real craft notes never go into tests.
"""

import uuid

from fastapi.testclient import TestClient

NOTE = {"title": "Fake checklist", "body": "- Fake item one\n- Fake item two", "kind": "checklist"}


def test_save_and_edit_a_note(alice: TestClient) -> None:
    note_id = str(uuid.uuid4())
    saved = alice.put(f"/api/craft-notes/{note_id}", json=NOTE | {"area": "rewriting"}).json()
    assert saved["kind"] == "checklist" and saved["area"] == "rewriting"
    edited = alice.put(f"/api/craft-notes/{note_id}", json=NOTE | {"body": "Fake"}).json()
    assert edited["body"] == "Fake" and edited["area"] == "writing"  # the default area
    assert alice.delete(f"/api/craft-notes/{note_id}").status_code == 204
    assert alice.delete(f"/api/craft-notes/{note_id}").status_code == 204  # replayed delete
    assert alice.get("/api/craft-notes").json() == []


def test_notes_come_back_in_position_order(alice: TestClient) -> None:
    for position, title in [(2, "Fake B"), (1, "Fake A")]:
        alice.put(f"/api/craft-notes/{uuid.uuid4()}", json={"title": title, "position": position})
    assert [n["title"] for n in alice.get("/api/craft-notes").json()] == ["Fake A", "Fake B"]


def test_created_at_is_kept_on_create_only(alice: TestClient) -> None:
    note_id = str(uuid.uuid4())
    body = NOTE | {"created_at": "2023-07-04T12:00:00+05:30"}
    first = alice.put(f"/api/craft-notes/{note_id}", json=body).json()
    assert first["created_at"].startswith("2023-07-04")
    later = alice.put(f"/api/craft-notes/{note_id}", json=NOTE | {"created_at": None}).json()
    assert later["created_at"].startswith("2023-07-04")


def test_kinds_areas_titles_and_links_are_checked(alice: TestClient) -> None:
    bad = [
        NOTE | {"kind": "poem"},
        NOTE | {"area": "green room"},
        NOTE | {"title": "  "},
        NOTE | {"url": "javascript:alert(1)"},
    ]
    for body in bad:
        assert alice.put(f"/api/craft-notes/{uuid.uuid4()}", json=body).status_code == 422
    tags = alice.put(f"/api/craft-notes/{uuid.uuid4()}", json=NOTE | {"hashtags": [" #a ", ""]})
    assert tags.json()["hashtags"] == ["#a"]


def test_other_users_cannot_see_or_change(alice: TestClient, bob: TestClient) -> None:
    note_id = str(uuid.uuid4())
    alice.put(f"/api/craft-notes/{note_id}", json=NOTE)
    assert bob.get("/api/craft-notes").json() == []
    assert bob.put(f"/api/craft-notes/{note_id}", json=NOTE).status_code == 404
    bob.delete(f"/api/craft-notes/{note_id}")
    assert len(alice.get("/api/craft-notes").json()) == 1


def test_a_brainstorm_session_can_run_a_technique(alice: TestClient, bob: TestClient) -> None:
    note_id, session_id = str(uuid.uuid4()), str(uuid.uuid4())
    alice.put(f"/api/craft-notes/{note_id}", json=NOTE | {"kind": "technique"})
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
    body = NOTE | {"performance_log_id": log_id, "analysis_id": analysis_id}
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
