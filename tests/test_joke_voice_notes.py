"""A joke remembers the voice notes it came from, and Claude sees both sides. Made-up material."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.connector import library, notebook, voice
from tests.conftest import signed_in
from tests.test_connector_voice import user
from tests.test_jokes import put_joke
from tests.test_voice_notes import new_note


def test_a_joke_keeps_its_voice_notes_once_each(alice: TestClient) -> None:
    note = new_note(alice, label="Fake idea on the bus")
    saved = put_joke(alice, voice_note_ids=[note, note]).json()
    assert saved["voice_note_ids"] == [note]


def test_a_save_without_them_keeps_them_and_an_empty_list_clears(alice: TestClient) -> None:
    """An app from before voice links leaves the field out; that mustn't drop the link."""
    note, joke_id = new_note(alice, label="Fake idea"), str(uuid.uuid4())
    first = put_joke(alice, joke_id, voice_note_ids=[note]).json()
    older = put_joke(alice, joke_id, punchline="Fake punch", base_version=first["version"]).json()
    assert older["voice_note_ids"] == [note]
    cleared = put_joke(alice, joke_id, voice_note_ids=[], base_version=older["version"]).json()
    assert cleared["voice_note_ids"] == []


def test_a_recording_not_uploaded_yet_can_be_linked(alice: TestClient) -> None:
    """Recorded offline, the note reaches the server after the joke: the link waits for it."""
    waiting = str(uuid.uuid4())
    assert put_joke(alice, voice_note_ids=[waiting]).json()["voice_note_ids"] == [waiting]


def test_a_new_joke_starts_with_none(alice: TestClient) -> None:
    assert put_joke(alice).json()["voice_note_ids"] == []


def test_claude_sees_where_a_joke_came_from(db: Session) -> None:
    dev = signed_in("dev@example.com")
    kept, binned = new_note(dev, label="Fake kept idea"), new_note(dev, label="Fake binned idea")
    joke = put_joke(dev, voice_note_ids=[kept, binned]).json()["id"]
    dev.delete(f"/api/voice-notes/{binned}")
    me = user(db, "dev@example.com")
    [found] = library.get_jokes(db, me, [joke])["jokes"]
    assert found["from_voice_notes"] == [{"id": kept, "label": "Fake kept idea"}]
    [note] = voice.search_voice_notes(db, me, "kept")["voice_notes"]
    assert note["joke_ids"] == [joke]


def test_claude_sees_the_brainstorms_an_observation_was_in(db: Session) -> None:
    dev = signed_in("dev@example.com")
    obs, session = str(uuid.uuid4()), str(uuid.uuid4())
    dev.put(f"/api/observations/{obs}", json={"text": "Fake noticed at the market"})
    dev.put(f"/api/sessions/{session}", json={"title": "Fake session", "observation_ids": [obs]})
    me = user(db, "dev@example.com")
    [found] = notebook.search_observations(db, me, "market")["observations"]
    assert found["brainstorm_ids"] == [session]
    dev.delete(f"/api/sessions/{session}")
    [after] = notebook.search_observations(db, me, "market")["observations"]
    assert after["brainstorm_ids"] == []
