"""A save that changes nothing (Save pressed with no edit, text typed and deleted again, a retry
whose answer was lost) isn't a new version. So another device's edit, waiting from that version,
still goes through rather than clashing over nothing. Made-up material."""

import uuid
from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests.conftest import random_topic_id
from tests.test_craft import note_in
from tests.test_jokes import put_joke
from tests.test_sessions import STROKE

Body = Callable[[TestClient], dict[str, Any]]


def joke(client: TestClient) -> dict[str, Any]:
    topic = random_topic_id(client)
    return {"setup": "Fake setup", "topic_id": topic, "types": ["One-Liner"], "status": "Draft"}


def setlist(client: TestClient) -> dict[str, Any]:
    on_it = put_joke(client).json()["id"]
    return {"name": "Fake set", "items": [{"joke_id": on_it, "optional": True}], "tag_ids": []}


def session(_: TestClient) -> dict[str, Any]:
    return {"title": "Fake pages", "content": "Fake words", "ink": [STROKE], "timer_seconds": 30}


def premise(client: TestClient) -> dict[str, Any]:
    return {"topic_id": random_topic_id(client), "take": "A fake take"}


KINDS: list[tuple[str, Body, str]] = [
    ("/api/jokes", joke, "setup"),
    ("/api/setlists", setlist, "name"),
    ("/api/sessions", session, "content"),
    ("/api/craft-notes", note_in, "body"),
    ("/api/observations", lambda _: {"text": "Fake thing noticed"}, "text"),
    ("/api/premises", premise, "take"),
]


@pytest.mark.parametrize(("path", "body", "words"), KINDS)
def test_a_save_that_changes_nothing_keeps_the_version(
    alice: TestClient, path: str, body: Body, words: str
) -> None:
    url, first = f"{path}/{uuid.uuid4()}", body(alice)
    assert alice.put(url, json=first).json()["version"] == 1
    # The iPad: Save pressed with nothing changed.
    assert alice.put(url, json={**first, "base_version": 1}).json()["version"] == 1
    # The phone's edit, made offline from version 1, then goes through.
    phone = alice.put(url, json={**first, words: "Fake phone edit", "base_version": 1})
    assert (phone.status_code, phone.json()["version"]) == (200, 2)


def test_handwriting_changed_stroke_for_stroke_is_a_change(alice: TestClient) -> None:
    url = f"/api/sessions/{uuid.uuid4()}"
    alice.put(url, json=session(alice))
    redrawn = {**STROKE, "color": "#ef4444"}
    saved = alice.put(url, json={**session(alice), "ink": [redrawn], "base_version": 1})
    assert saved.json()["version"] == 2
    stale = alice.put(url, json={**session(alice), "content": "Elsewhere", "base_version": 1})
    assert stale.status_code == 409
