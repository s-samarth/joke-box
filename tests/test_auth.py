"""Sign-in, sessions, defaults and CSRF protection."""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import app
from tests.conftest import random_topic_id


def test_health() -> None:
    body = TestClient(app).get("/health").json()
    assert body["status"] == "ok"
    assert body["env"] == "local"


def test_signed_out_requests_are_rejected() -> None:
    client = TestClient(app)
    assert client.get("/api/jokes").status_code == 401
    assert client.get("/api/me").status_code == 401


def test_first_login_creates_random_topic_and_statuses(alice: TestClient) -> None:
    me = alice.get("/api/me").json()
    assert me["email"] == "alice@example.com"
    assert me["plan"] == "Pro"
    topics = alice.get("/api/topics").json()
    assert [t["name"] for t in topics] == ["Random"]
    statuses = [s["name"] for s in alice.get("/api/statuses").json()]
    assert statuses[:3] == ["Incomplete", "Work in Progress", "Complete"]


def test_second_login_does_not_duplicate_defaults(alice: TestClient) -> None:
    alice.get("/auth/dev-login", params={"email": "alice@example.com"}, follow_redirects=False)
    assert len(alice.get("/api/topics").json()) == 1
    assert len(alice.get("/api/statuses").json()) == 6


def test_changes_without_csrf_header_are_refused(alice: TestClient) -> None:
    body = {"setup": "x", "topic_id": random_topic_id(alice)}
    response = alice.put(f"/api/jokes/{uuid.uuid4()}", json=body, headers={"X-Requested-With": ""})
    assert response.status_code == 403


def test_logout_clears_session(alice: TestClient) -> None:
    assert alice.post("/auth/logout").status_code == 200
    assert alice.get("/api/me").status_code == 401


def test_google_login_unconfigured_is_clear() -> None:
    response = TestClient(app).get("/auth/google/login", follow_redirects=False)
    assert response.status_code == 503


def test_local_mode_refuses_to_run_on_vercel(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("VERCEL", "1")
    with pytest.raises(RuntimeError, match="APP_ENV"):
        Settings(app_env="local").check_production_safety()
    with pytest.raises(RuntimeError, match="SESSION_SECRET"):
        Settings(app_env="production", database_url="postgresql://x/y").check_production_safety()
