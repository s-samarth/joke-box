"""A sign-in stays alive while the app is used: the cookie is sent again once a day."""

import pytest
from fastapi.testclient import TestClient

from app.auth import deps

COOKIE = "jokebox_session"


def sets_cookie(client: TestClient) -> bool:
    response = client.get("/api/me")
    assert response.status_code == 200
    return COOKIE in response.headers.get("set-cookie", "")


def test_the_cookie_is_renewed_once_a_day(
    alice: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(deps, "today", lambda: "2026-10-30")
    assert sets_cookie(alice)  # the first request of the day
    assert not sets_cookie(alice)  # the rest of that day leave it alone
    monkeypatch.setattr(deps, "today", lambda: "2026-10-31")
    assert sets_cookie(alice)


def test_a_renewed_cookie_keeps_you_signed_in(
    alice: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(deps, "today", lambda: "2026-11-01")
    response = alice.get("/api/me")
    assert "Max-Age=2592000" in response.headers["set-cookie"]
    assert alice.get("/api/me").status_code == 200
