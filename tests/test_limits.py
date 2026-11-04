"""Requests bigger than the database holds are refused with 422 up front. On Postgres (CI) they
used to fail as 500s after being accepted; SQLite ignores lengths, so there they were kept.
Everything here is made up."""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.schemas.limits import INT_MAX
from tests.test_jokes import put_joke
from tests.test_sessions import put_session

TOO_BIG = INT_MAX + 1


@pytest.mark.parametrize(
    "fields",
    [
        {"types": ["x" * 81]},
        {"status": "x" * 81},
        {"language": "x" * 41},
        {"duration_seconds": TOO_BIG},
        {"base_version": TOO_BIG},
    ],
)
def test_a_joke_too_big_for_its_columns_is_refused(alice: TestClient, fields: dict) -> None:  # type: ignore[type-arg]
    assert put_joke(alice, **fields).status_code == 422


def test_the_longest_names_that_fit_are_kept(alice: TestClient) -> None:
    saved = put_joke(alice, types=["t" * 80], status="s" * 80, language="l" * 40)
    assert saved.status_code == 200, saved.text
    assert saved.json()["types"] == ["t" * 80]


def test_names_too_long_for_their_columns(alice: TestClient) -> None:
    assert alice.post("/api/statuses", json={"name": "s" * 81}).status_code == 422
    color = {"name": "t" * 81, "color": "#aabbcc"}
    assert alice.put("/api/types/color", json=color).status_code == 422
    put_joke(alice, types=["Fake type"])
    type_id = alice.get("/api/types").json()[0]["id"]
    assert alice.patch(f"/api/types/{type_id}", json={"name": "t" * 81}).status_code == 422
    assert alice.post("/api/venues", json={"name": "v" * 121}).status_code == 422


def test_sets_shows_and_sessions_with_numbers_past_an_integer(alice: TestClient) -> None:
    set_body = {"name": "Fake set", "venue_name": "v" * 161}
    assert alice.put(f"/api/setlists/{uuid.uuid4()}", json=set_body).status_code == 422
    set_body = {"name": "Fake set", "target_seconds": TOO_BIG}
    assert alice.put(f"/api/setlists/{uuid.uuid4()}", json=set_body).status_code == 422
    show = {"performed_at": "2026-10-01T20:00:00Z", "audience_size": TOO_BIG}
    assert alice.put(f"/api/logs/{uuid.uuid4()}", json=show).status_code == 422
    assert put_session(alice, str(uuid.uuid4()), timer_seconds=TOO_BIG).status_code == 422
