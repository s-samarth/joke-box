"""Bridges in a set (docs/sets.md): saved on the joke or block they follow, kept when an app from
before bridges leaves them out, cleared only by an empty list, and read by Claude's get_set."""

import uuid
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.connector import performing
from tests.test_connector_tools import account, dev  # noqa: F401
from tests.test_jokes import put_joke
from tests.test_set_beats import beat, jokes_entry, piece, put_beats


def bridge(text: str, n: int = 0) -> dict[str, str]:
    return {"id": f"br{n}", "text": text}


def first_entry(client: TestClient) -> dict[str, Any]:
    [s] = client.get("/api/setlists").json()
    entry: dict[str, Any] = s["beats"][0]["entries"][0]
    return entry


def test_bridges_are_saved_and_kept_when_left_out(alice: TestClient) -> None:
    a, b = put_joke(alice).json()["id"], put_joke(alice).json()["id"]
    set_id = str(uuid.uuid4())
    lines = [bridge("Fake bridge line"), bridge("Fake second paragraph", 1)]
    block = jokes_entry(piece(a, bridges=lines), piece(b)) | {"bridges": [bridge("Fake link")]}
    put_beats(alice, set_id, beat(block))
    saved = first_entry(alice)
    assert [x["text"] for x in saved["pieces"][0]["bridges"]] == [x["text"] for x in lines]
    assert saved["bridges"] == [bridge("Fake link")]
    # An app from before bridges sends none: the stored ones stay, on the joke and the block.
    put_beats(alice, set_id, beat(jokes_entry(piece(a), piece(b)), cue="Edited"))
    kept = first_entry(alice)
    assert len(kept["pieces"][0]["bridges"]) == 2
    assert kept["bridges"] == [bridge("Fake link")]
    # An empty list clears them.
    put_beats(alice, set_id, beat(jokes_entry(piece(a, bridges=[]), piece(b)) | {"bridges": []}))
    cleared = first_entry(alice)
    assert cleared["pieces"][0]["bridges"] == []
    assert cleared["bridges"] == []


def test_a_bridge_moves_with_its_joke(alice: TestClient) -> None:
    a, b = put_joke(alice).json()["id"], put_joke(alice).json()["id"]
    set_id = str(uuid.uuid4())
    put_beats(alice, set_id, beat(jokes_entry(piece(a, bridges=[bridge("Fake")]), piece(b))))
    # Reordered by an older app that doesn't know bridges: the bridge follows the joke's id.
    put_beats(alice, set_id, beat(jokes_entry(piece(b), piece(a))))
    pieces = first_entry(alice)["pieces"]
    assert pieces[0]["bridges"] is None
    assert pieces[1]["bridges"] == [bridge("Fake")]


def test_too_many_bridges_are_refused(alice: TestClient) -> None:
    a = put_joke(alice).json()["id"]
    many = [bridge("Fake", n) for n in range(21)]
    saved = put_beats(alice, str(uuid.uuid4()), beat(jokes_entry(piece(a, bridges=many))))
    assert saved.status_code == 422


def test_claude_reads_the_bridges(dev: TestClient, db: Session) -> None:  # noqa: F811
    a, b = put_joke(dev).json()["id"], put_joke(dev).json()["id"]
    set_id = str(uuid.uuid4())
    said = [bridge("Fake bridge"), bridge("  ", 1)]  # a blank bridge isn't read out
    crowd = {"kind": "crowd", "id": "c", "title": "Fake", "questions": []}
    entries = (jokes_entry(piece(a, bridges=said), piece(b)) | {"bridges": said}, crowd)
    put_beats(dev, set_id, beat(*entries), name="Fake set")
    opened = performing.get_set(db, account(db, "dev@example.com"), set_id)
    first, second = opened["beats"][0]["entries"]
    assert first["bridges_after"] == ["Fake bridge"]
    assert [j["bridges_after"] for j in first["jokes"]] == [["Fake bridge"], []]
    assert second["bridges_after"] == []
