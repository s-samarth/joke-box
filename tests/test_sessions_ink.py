"""A session's handwriting stays in the database unless it's asked for: the list and a save
only need the stroke count. Everything here is made up."""

import re
import uuid

from fastapi.testclient import TestClient

from tests.test_sessions import STROKE, put_session
from tests.test_sessions_packed import unpacked

# The ink column itself, not ink_pages or ink_strokes.
READS_INK = re.compile(r"writing_sessions\.ink\b(?!_)")


def test_the_list_and_saves_leave_the_ink_alone(alice: TestClient, queries: list[str]) -> None:
    session_id = str(uuid.uuid4())
    first = put_session(alice, session_id, ink=[STROKE, STROKE])
    assert first.json()["ink_strokes"] == 2
    again = put_session(alice, session_id, ink=[STROKE, STROKE, STROKE])
    assert again.json()["ink_strokes"] == 3
    [summary] = alice.get("/api/sessions/summaries").json()
    assert (summary["ink_strokes"], summary["ink_pages"]) == (3, 1)
    assert not [q for q in queries if READS_INK.search(q)]
    assert "ink" not in summary


def test_opening_a_session_still_brings_its_ink(alice: TestClient) -> None:
    session_id = str(uuid.uuid4())
    put_session(alice, session_id, ink=[STROKE])
    opened = alice.get(f"/api/sessions/{session_id}")
    assert opened.status_code == 200
    assert unpacked(opened)["ink"][0]["points"][0] == [10, 20, 0.5]
    assert len(alice.get("/api/sessions").json()[0]["ink"]) == 1  # the older full list too
    assert alice.get(f"/api/sessions/{uuid.uuid4()}").status_code == 404
