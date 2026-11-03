"""Sessions too big for the host's 4.5 MB limit as plain JSON: saved gzip-packed, listed without
their ink, and sent back one at a time, packed. Older app versions keep the plain endpoints."""

import gzip
import json
import uuid

from fastapi.testclient import TestClient

from app.packed import MAX_UNPACKED, PACKED_JSON

STROKE = {"color": "#f5f5f4", "size": 3, "points": [[10.5, 20.5, 0.5], [30, 40, 0.7]]}


def packed_put(client: TestClient, session_id: str, body: object | bytes):  # type: ignore[no-untyped-def]
    data = body if isinstance(body, bytes) else gzip.compress(json.dumps(body).encode())
    return client.put(
        f"/api/sessions/{session_id}", content=data, headers={"content-type": PACKED_JSON}
    )


def unpacked(response) -> dict:  # type: ignore[no-untyped-def,type-arg]
    assert response.headers["content-type"] == PACKED_JSON
    return json.loads(gzip.decompress(response.content))  # type: ignore[no-any-return]


def test_a_packed_save_is_kept_like_a_plain_one(alice: TestClient) -> None:
    session_id = str(uuid.uuid4())
    response = packed_put(alice, session_id, {"title": "Fake pages", "ink": [STROKE, STROKE]})
    assert response.status_code == 200
    assert response.json()["ink_strokes"] == 2
    assert "ink" not in response.json()  # the answer to a save leaves the ink out
    assert alice.get("/api/sessions").json()[0]["ink"][0]["points"][0] == [10.5, 20.5, 0.5]


def test_a_big_session_fits_once_packed(alice: TestClient) -> None:
    """Twenty pages of dense handwriting: over the limit as JSON, well under it packed."""
    stroke = {
        "color": "#f5f5f4",
        "size": 2.4,
        "points": [[i % 1000, i % 1400, 0.5] for i in range(70)],
    }
    ink = [{**stroke, "page": page} for page in range(20) for _ in range(450)]
    body = {"title": "Fake long session", "ink": ink, "ink_pages": 20}
    assert len(json.dumps(body)) > 4_500_000
    data = gzip.compress(json.dumps(body).encode())
    assert len(data) < 4_500_000
    assert packed_put(alice, (session_id := str(uuid.uuid4())), data).status_code == 200
    whole = alice.get(f"/api/sessions/{session_id}")
    assert len(whole.content) < 4_500_000
    assert len(unpacked(whole)["ink"]) == 9000


def test_summaries_leave_out_the_ink(alice: TestClient) -> None:
    session_id = str(uuid.uuid4())
    alice.put(
        f"/api/sessions/{session_id}", json={"title": "Fake", "ink": [STROKE], "ink_pages": 2}
    )
    [summary] = alice.get("/api/sessions/summaries").json()
    assert summary["id"] == session_id
    assert summary["ink_strokes"] == 1 and summary["ink_pages"] == 2
    assert "ink" not in summary


def test_one_session_comes_back_whole_and_packed(alice: TestClient) -> None:
    session_id = str(uuid.uuid4())
    alice.put(
        f"/api/sessions/{session_id}", json={"title": "Fake", "ink": [STROKE], "timer_seconds": 61}
    )
    whole = unpacked(alice.get(f"/api/sessions/{session_id}"))
    assert whole["ink"][0]["points"][1] == [30, 40, 0.7]
    assert whole["timer_seconds"] == 61


def test_only_your_own_sessions_and_never_the_trash(alice: TestClient, bob: TestClient) -> None:
    session_id = str(uuid.uuid4())
    alice.put(f"/api/sessions/{session_id}", json={"title": "Fake"})
    assert bob.get(f"/api/sessions/{session_id}").status_code == 404
    assert bob.get("/api/sessions/summaries").json() == []
    alice.delete(f"/api/sessions/{session_id}")
    assert alice.get("/api/sessions/summaries").json() == []
    assert alice.get(f"/api/sessions/{session_id}").status_code == 404
    assert (
        alice.get(f"/api/sessions/{uuid.uuid4()}").status_code == 404
    )  # a new session: not there yet


def test_a_damaged_or_oversized_packed_save_is_refused(alice: TestClient) -> None:
    session_id = str(uuid.uuid4())
    assert packed_put(alice, session_id, b"not gzip at all").status_code == 400
    cut_off = gzip.compress(json.dumps({"title": "Fake"}).encode())[:-8]
    assert packed_put(alice, session_id, cut_off).status_code == 400
    bomb = gzip.compress(b" " * (MAX_UNPACKED + 10))
    assert packed_put(alice, session_id, bomb).status_code == 413
    assert alice.get("/api/sessions/summaries").json() == []


def test_a_packed_save_still_needs_the_csrf_header(alice: TestClient) -> None:
    data = gzip.compress(json.dumps({"title": "Fake"}).encode())
    response = alice.put(
        f"/api/sessions/{uuid.uuid4()}",
        content=data,
        headers={"content-type": PACKED_JSON, "x-requested-with": ""},
    )
    assert response.status_code == 403
