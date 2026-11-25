"""Sets as beats: the edges of what a save puts right (docs/sets.md). Made-up material."""

import uuid

from fastapi.testclient import TestClient

from tests.test_jokes import put_joke
from tests.test_set_beats import beat, jokes_entry, piece, put_beats


def pieces_of(client: TestClient, set_id: str) -> list[dict[str, object]]:
    shown = next(s for s in client.get("/api/setlists").json() if s["id"] == set_id)
    pieces: list[dict[str, object]] = shown["beats"][0]["entries"][0]["pieces"]
    return pieces


def test_a_hidden_joke_after_a_gate_stays_outside_it(alice: TestClient) -> None:
    a, b, c = (put_joke(alice).json()["id"] for _ in range(3))
    set_id = str(uuid.uuid4())
    put_beats(alice, set_id, beat(jokes_entry(piece(a, gate=1), piece(b, 1), piece(c, 2))))
    alice.delete(f"/api/jokes/{c}")
    shown = next(s for s in alice.get("/api/setlists").json() if s["id"] == set_id)
    put_beats(alice, set_id, *shown["beats"])  # the app saves what it shows, without c
    alice.post(f"/api/trash/jokes/{c}/restore")
    pieces = pieces_of(alice, set_id)
    assert [(p["joke_id"], p["gate"]) for p in pieces] == [(a, 1), (b, 0), (c, 0)]


def test_a_cluster_that_isnt_there_is_dropped_from_the_joke(alice: TestClient) -> None:
    a = put_joke(alice).json()["id"]
    set_id = str(uuid.uuid4())
    gone = str(uuid.uuid4())
    put_beats(alice, set_id, beat(jokes_entry(piece(a, cluster_id=gone, pinned=True))))
    [p] = pieces_of(alice, set_id)
    assert (p["joke_id"], p["cluster_id"], p["pinned"]) == (a, None, False)


def test_a_standalone_title_and_loose_flag_survive_a_round_trip(alice: TestClient) -> None:
    a, b = (put_joke(alice).json()["id"] for _ in range(2))
    set_id = str(uuid.uuid4())
    entry = jokes_entry(piece(a), piece(b, 1, loose=True)) | {"title": "Fake bits"}
    put_beats(alice, set_id, beat(entry))
    shown = next(s for s in alice.get("/api/setlists").json() if s["id"] == set_id)
    stored = shown["beats"][0]["entries"][0]
    assert stored["title"] == "Fake bits"
    assert [p["loose"] for p in stored["pieces"]] == [False, True]
