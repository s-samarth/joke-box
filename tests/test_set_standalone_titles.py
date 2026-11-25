"""A Standalone block's title (docs/sets.md): saved with the beats, kept when an app from before
titles leaves it out, cleared only by an empty one."""

import uuid

from fastapi.testclient import TestClient

from tests.test_jokes import put_joke
from tests.test_set_beats import beat, jokes_entry, piece, put_beats


def entries(client: TestClient) -> list[dict[str, object]]:
    [s] = client.get("/api/setlists").json()
    return [e for b in s["beats"] for e in b["entries"]]


def test_a_standalone_title_is_saved_and_kept_when_left_out(alice: TestClient) -> None:
    joke = put_joke(alice).json()["id"]
    set_id = str(uuid.uuid4())
    titled = jokes_entry(piece(joke)) | {"title": "Fake gym bits"}
    put_beats(alice, set_id, beat(titled))
    assert entries(alice)[0]["title"] == "Fake gym bits"
    # An app from before titles sends the block without one: the stored title stays.
    put_beats(alice, set_id, beat(jokes_entry(piece(joke)), cue="Edited"))
    assert entries(alice)[0]["title"] == "Fake gym bits"
    # An empty title clears it.
    put_beats(alice, set_id, beat(jokes_entry(piece(joke)) | {"title": ""}))
    assert entries(alice)[0]["title"] == ""


def test_a_new_block_has_no_title(alice: TestClient) -> None:
    joke = put_joke(alice).json()["id"]
    set_id = str(uuid.uuid4())
    put_beats(alice, set_id, beat(jokes_entry(piece(joke), entry_id="new-block")))
    assert entries(alice)[0]["title"] is None
