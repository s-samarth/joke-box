"""Free brainstorm sessions: text, handwriting strokes, timer and links, per user."""

import uuid

from fastapi.testclient import TestClient

STROKE = {"color": "#f5f5f4", "size": 3, "points": [[10, 20, 0.5], [30, 40, 0.7]]}


def put_session(client: TestClient, session_id: str, **fields: object):  # type: ignore[no-untyped-def]
    body = {"title": "Fake morning pages", "content": "Fake words", **fields}
    return client.put(f"/api/sessions/{session_id}", json=body)


def test_create_with_ink_links_and_timer(alice: TestClient) -> None:
    session_id, bit_id = str(uuid.uuid4()), str(uuid.uuid4())
    response = put_session(alice, session_id, ink=[STROKE], timer_seconds=95, bit_ids=[bit_id])
    assert response.status_code == 200
    saved = alice.get("/api/sessions").json()[0]
    assert saved["ink"][0]["points"][1] == [30, 40, 0.7]
    assert saved["timer_seconds"] == 95
    assert saved["bit_ids"] == [bit_id]


def test_update_replaces_fields(alice: TestClient) -> None:
    session_id = str(uuid.uuid4())
    put_session(alice, session_id, ink=[STROKE])
    updated = put_session(alice, session_id, content="Fake rewrite", ink=[]).json()
    assert updated["content"] == "Fake rewrite"
    assert updated["ink"] == []
    assert len(alice.get("/api/sessions").json()) == 1


def test_bad_stroke_is_rejected(alice: TestClient) -> None:
    bad = {**STROKE, "size": 0}
    assert put_session(alice, str(uuid.uuid4()), ink=[bad]).status_code == 422


def test_delete_is_idempotent(alice: TestClient) -> None:
    session_id = str(uuid.uuid4())
    put_session(alice, session_id)
    assert alice.delete(f"/api/sessions/{session_id}").status_code == 204
    assert alice.delete(f"/api/sessions/{session_id}").status_code == 204
    assert alice.get("/api/sessions").json() == []


def test_sessions_are_private(alice: TestClient, bob: TestClient) -> None:
    session_id = str(uuid.uuid4())
    put_session(alice, session_id)
    assert bob.get("/api/sessions").json() == []
    put_session(bob, session_id, content="Fake takeover")
    bob.delete(f"/api/sessions/{session_id}")
    assert alice.get("/api/sessions").json()[0]["content"] == "Fake words"


def test_pages_are_kept_and_cover_every_stroke(alice: TestClient) -> None:
    session_id = str(uuid.uuid4())
    saved = put_session(alice, session_id, ink=[STROKE], ink_pages=3).json()
    assert saved["ink_pages"] == 3  # blank pages 2 and 3 survive
    assert saved["ink"][0]["page"] == 0  # strokes saved before pages existed are on page 1
    on_page_five = {**STROKE, "page": 4}
    assert put_session(alice, session_id, ink=[on_page_five], ink_pages=1).json()["ink_pages"] == 5


def test_page_count_is_capped(alice: TestClient) -> None:
    assert put_session(alice, str(uuid.uuid4()), ink_pages=21).status_code == 422
    assert put_session(alice, str(uuid.uuid4()), ink=[{**STROKE, "page": 20}]).status_code == 422
