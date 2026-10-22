"""Voice notes: details, audio upload and playback, limits, deletes and privacy.

Audio goes to a temporary folder instead of Vercel Blob; the bytes are made up, not speech.
"""

import uuid
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers.voice import MAX_AUDIO_BYTES
from app.services.audio_store import LocalAudioStore, get_audio_store

FAKE_AUDIO = b"\x00\x00\x00\x18ftypM4A fake audio bytes"
AUDIO = {"Content-Type": "audio/mp4"}


@pytest.fixture
def store(tmp_path: Path) -> Iterator[LocalAudioStore]:
    local = LocalAudioStore(tmp_path / "audio")
    app.dependency_overrides[get_audio_store] = lambda: local
    yield local


def new_note(client: TestClient, **fields: object) -> str:
    note_id = str(uuid.uuid4())
    body = {"label": "", "hashtags": [], "duration_seconds": 12} | fields
    assert client.put(f"/api/voice-notes/{note_id}", json=body).status_code == 200
    return note_id


def test_record_upload_and_play_back(alice: TestClient, store: LocalAudioStore) -> None:
    note_id = new_note(alice, label="  Airport bit  ", hashtags=["#travel", " "])
    listed = alice.get("/api/voice-notes").json()
    assert listed[0]["label"] == "Airport bit" and listed[0]["hashtags"] == ["#travel"]
    assert listed[0]["has_audio"] is False

    uploaded = alice.put(f"/api/voice-notes/{note_id}/audio", content=FAKE_AUDIO, headers=AUDIO)
    assert uploaded.status_code == 200
    assert uploaded.json()["has_audio"] is True
    assert uploaded.json()["size_bytes"] == len(FAKE_AUDIO)

    played = alice.get(f"/api/voice-notes/{note_id}/audio")
    assert played.content == FAKE_AUDIO
    assert played.headers["content-type"] == "audio/mp4"
    assert "private" in played.headers["cache-control"]


def test_retrying_an_upload_replaces_the_audio(alice: TestClient, store: LocalAudioStore) -> None:
    note_id = new_note(alice)
    alice.put(f"/api/voice-notes/{note_id}/audio", content=b"first", headers=AUDIO)
    alice.put(f"/api/voice-notes/{note_id}/audio", content=b"second", headers=AUDIO)
    assert alice.get(f"/api/voice-notes/{note_id}/audio").content == b"second"


def test_only_audio_within_the_size_limit(alice: TestClient, store: LocalAudioStore) -> None:
    note_id = new_note(alice)
    url = f"/api/voice-notes/{note_id}/audio"
    assert (
        alice.put(url, content=b"<html>", headers={"Content-Type": "text/html"}).status_code == 415
    )
    assert alice.put(url, content=b"", headers=AUDIO).status_code == 400
    too_big = b"\x00" * (MAX_AUDIO_BYTES + 1)
    assert alice.put(url, content=too_big, headers=AUDIO).status_code == 413
    assert alice.get(url).status_code == 404  # nothing was stored


def test_audio_needs_the_note_first(alice: TestClient, store: LocalAudioStore) -> None:
    url = f"/api/voice-notes/{uuid.uuid4()}/audio"
    assert alice.put(url, content=FAKE_AUDIO, headers=AUDIO).status_code == 404


def test_the_file_waits_in_the_trash(alice: TestClient, store: LocalAudioStore) -> None:
    note_id = new_note(alice)
    alice.put(f"/api/voice-notes/{note_id}/audio", content=FAKE_AUDIO, headers=AUDIO)
    assert alice.delete(f"/api/voice-notes/{note_id}").status_code == 204
    assert alice.get("/api/voice-notes").json() == []
    assert list(store.root.rglob("*.m4a"))  # kept until the Trash erases it
    assert alice.delete(f"/api/trash/voice-notes/{note_id}").status_code == 204
    assert not list(store.root.rglob("*.m4a"))
    assert alice.delete(f"/api/voice-notes/{note_id}").status_code == 204


def test_other_users_cannot_touch_a_note(
    alice: TestClient, bob: TestClient, store: LocalAudioStore
) -> None:
    note_id = new_note(alice, label="private")
    alice.put(f"/api/voice-notes/{note_id}/audio", content=FAKE_AUDIO, headers=AUDIO)
    assert bob.get("/api/voice-notes").json() == []
    assert bob.get(f"/api/voice-notes/{note_id}/audio").status_code == 404
    url = f"/api/voice-notes/{note_id}"
    assert bob.put(f"{url}/audio", content=b"x", headers=AUDIO).status_code == 404
    assert bob.put(url, json={"label": "mine"}).status_code == 404
    assert bob.delete(url).status_code == 404
    assert alice.get(f"{url}/audio").content == FAKE_AUDIO


def test_blob_calls_see_the_requests_oidc_header(monkeypatch: pytest.MonkeyPatch) -> None:
    """The Blob SDK finds Vercel's sign-in token in the request headers; check they reach it."""
    from vercel.blob import sync as blob
    from vercel.headers import get_headers

    from app.services.audio_store import BlobAudioStore

    seen: list[object] = []
    monkeypatch.setattr(blob, "put_blob", lambda *a, **k: seen.append(get_headers()))
    BlobAudioStore({"x-vercel-oidc-token": "fake-token"}).put("voice/x.m4a", b"x", "audio/mp4")
    assert seen == [{"x-vercel-oidc-token": "fake-token"}]
    assert get_headers() is None  # nothing leaks past the call


def test_an_import_keeps_the_original_date(alice: TestClient) -> None:
    note_id = new_note(alice, created_at="2023-02-13T15:47:37Z")
    assert alice.get("/api/voice-notes").json()[0]["created_at"].startswith("2023-02-13")
    new_note(alice)  # recorded now, so it lists first
    assert alice.get("/api/voice-notes").json()[1]["id"] == note_id
