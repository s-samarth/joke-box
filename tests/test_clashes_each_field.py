"""Every field a save can change moves the version on, one field at a time. If the "would this
save change anything?" check forgot a field, an edit to only that field would keep the version,
and another device's older save would then go over it unchecked. The material is made up."""

import uuid
from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests.test_jokes import put_joke

JOKE_CHANGES: list[tuple[str, Any]] = [
    ("setup", "Fake other setup"),
    ("punchline", "Fake other punch"),
    ("types", ["Fake type"]),
    ("status", "Workshop"),
    ("strength", 5),
    ("comments", "Fake note"),
    ("tag_lines", ["Fake tag"]),
    ("hashtags", ["fake"]),
    ("duration_seconds", 45),
    ("alt_punchlines", ["Fake alternate"]),
]


@pytest.mark.parametrize(("field", "value"), JOKE_CHANGES, ids=[f for f, _ in JOKE_CHANGES])
def test_each_joke_field_moves_the_version(alice: TestClient, field: str, value: Any) -> None:
    joke_id = str(uuid.uuid4())
    first = put_joke(alice, joke_id, strength=3).json()
    changed = put_joke(
        alice, joke_id, base_version=first["version"], **({"strength": 3} | {field: value})
    )
    assert changed.status_code == 200 and changed.json()["version"] == first["version"] + 1
    stale = put_joke(alice, joke_id, strength=3, base_version=first["version"], setup="Fake late")
    assert stale.status_code == 409


SET_BASE: dict[str, Any] = {"name": "Fake set", "target_seconds": 600, "items": []}
SET_CHANGES: list[tuple[str, Any]] = [
    ("name", "Fake renamed"),
    ("target_seconds", 900),
    ("venue_name", "Fake Cellar"),
    ("rating", 4),
    ("show_date", "2026-12-01"),
    ("point", "Fake point"),
    ("status", "Stage Ready"),
]


@pytest.mark.parametrize(("field", "value"), SET_CHANGES, ids=[f for f, _ in SET_CHANGES])
def test_each_set_field_moves_the_version(alice: TestClient, field: str, value: Any) -> None:
    set_id = str(uuid.uuid4())
    first = alice.put(f"/api/setlists/{set_id}", json={**SET_BASE, "beats": []}).json()
    body = {**SET_BASE, "beats": [], "base_version": first["version"], field: value}
    changed = alice.put(f"/api/setlists/{set_id}", json=body)
    assert changed.status_code == 200 and changed.json()["version"] == first["version"] + 1
    stale = {**SET_BASE, "beats": [], "base_version": first["version"], "name": "Fake late"}
    assert alice.put(f"/api/setlists/{set_id}", json=stale).status_code == 409
