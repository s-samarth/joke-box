"""Several lists in one request, each answered as it would be alone. Everything here is made up."""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers import batch
from tests.conftest import signed_in
from tests.test_jokes import put_joke

LISTS = ["/api/me", "/api/jokes", "/api/topics", "/api/sessions/summaries", "/api/set-fields"]


def results(client: TestClient, paths: list[str]) -> list[dict[str, Any]]:
    response = client.post("/api/batch", json={"paths": paths})
    assert response.status_code == 200
    return response.json()["results"]


def test_each_list_matches_asking_for_it_alone(alice: TestClient) -> None:
    put_joke(alice, setup="Fake batched joke")
    for path, answer in zip(LISTS, results(alice, LISTS), strict=True):
        alone = alice.get(path)
        assert answer == {"status": alone.status_code, "body": alone.json()}, path


def test_each_user_sees_only_their_own_rows(alice: TestClient, bob: TestClient) -> None:
    put_joke(alice, setup="Fake alice joke")
    put_joke(bob, setup="Fake bob joke")
    for client, setup in ((alice, "Fake alice joke"), (bob, "Fake bob joke")):
        jokes = results(client, ["/api/jokes", "/api/me"])[0]["body"]
        assert [j["setup"] for j in jokes] == [setup]


def test_signed_out_each_list_says_so() -> None:
    stranger = TestClient(app, headers={"X-Requested-With": "jokebox"})
    for answer in results(stranger, ["/api/me", "/api/jokes"]):
        assert answer["status"] == 401
        assert answer["body"] == {"detail": "Not signed in"}


def test_only_list_addresses(alice: TestClient) -> None:
    for path in ("/api/batch", "/api/voice-notes/0a1b/audio", "/api/jokes?x=1", "/auth/logout"):
        assert alice.post("/api/batch", json={"paths": [path]}).status_code == 422
    too_many = {"paths": ["/api/jokes"] * (batch.MAX_PATHS + 1)}
    assert alice.post("/api/batch", json=too_many).status_code == 422


def test_needs_the_apps_own_header() -> None:
    client = signed_in("alice@example.com")
    del client.headers["X-Requested-With"]
    assert client.post("/api/batch", json={"paths": ["/api/jokes"]}).status_code == 403


def test_past_the_budget_comes_back_unsent(
    alice: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(batch, "BUDGET", len(alice.get("/api/me").content) + 40)
    first, second = results(alice, ["/api/me", "/api/topics"])
    assert first["status"] == 200
    assert second == {"status": None}


def test_an_answer_that_isnt_json_comes_back_unsent() -> None:
    """A page, audio or a packed session can't ride inside JSON: the app fetches it alone."""
    page = batch.Answer()
    page.status, page.body = 200, bytearray(b"<html>")
    assert batch.item(page, batch.BUDGET) == b'{"status":null}'
    failed = batch.Answer()  # a GET that raised stays a 500 with no body
    assert batch.item(failed, batch.BUDGET) == b'{"status":null}'
