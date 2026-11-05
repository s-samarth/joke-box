"""Craft notes, observations and premises edited on two devices: an edit made from an older
version that would change something is refused (409), never written over the other edit."""

import uuid
from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests.conftest import random_topic_id
from tests.test_craft import note_in

Body = Callable[[TestClient, str], dict[str, Any]]


def note(client: TestClient, words: str) -> dict[str, Any]:
    return {**note_in(client), "body": words}


def observation(_: TestClient, words: str) -> dict[str, Any]:
    return {"text": words}


def premise(client: TestClient, words: str) -> dict[str, Any]:
    return {"topic_id": random_topic_id(client), "take": words}


KINDS = [("/api/craft-notes", note), ("/api/observations", observation), ("/api/premises", premise)]


@pytest.mark.parametrize(("path", "body"), KINDS)
def test_an_edit_from_an_older_version_is_refused(alice: TestClient, path: str, body: Body) -> None:
    url = f"{path}/{uuid.uuid4()}"
    assert alice.put(url, json=body(alice, "Fake first")).json()["version"] == 1
    phone = alice.put(url, json={**body(alice, "Fake phone edit"), "base_version": 1})
    assert phone.json()["version"] == 2
    ipad = alice.put(url, json={**body(alice, "Fake iPad edit"), "base_version": 1})
    assert ipad.status_code == 409
    assert "another device" in ipad.json()["detail"]
    kept = next(x for x in alice.get(path).json() if x["id"] == phone.json()["id"])
    assert kept["version"] == 2


@pytest.mark.parametrize(("path", "body"), KINDS)
def test_retries_and_older_apps_go_through(alice: TestClient, path: str, body: Body) -> None:
    url = f"{path}/{uuid.uuid4()}"
    alice.put(url, json=body(alice, "Fake first"))
    edit = {**body(alice, "Fake edit"), "base_version": 1}
    assert alice.put(url, json=edit).status_code == 200
    assert alice.put(url, json=edit).status_code == 200  # the answer was lost: sent again
    assert alice.put(url, json=body(alice, "Fake old app")).status_code == 200
