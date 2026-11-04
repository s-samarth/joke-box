"""Taking an email off ALLOWED_EMAILS signs that person out at once, in the app and in Claude."""

import pytest
from fastapi.testclient import TestClient

from app.auth import deps
from app.config import Settings
from app.main import app
from tests.conftest import signed_in
from tests.connector_auth import call, connect


def allow(monkeypatch: pytest.MonkeyPatch, emails: str) -> None:
    deployed = Settings(app_env="production", allowed_emails=emails)
    monkeypatch.setattr(deps, "get_settings", lambda: deployed)


def test_an_email_off_the_list_is_signed_out(
    alice: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    allow(monkeypatch, "Alice@example.com, bob@example.com")
    assert alice.get("/api/topics").status_code == 200
    allow(monkeypatch, "bob@example.com")
    assert alice.get("/api/topics").status_code == 401
    allow(monkeypatch, "alice@example.com")  # back on the list: the old cookie stays dead
    assert alice.get("/api/topics").status_code == 401


def test_claude_loses_access_with_the_email(monkeypatch: pytest.MonkeyPatch) -> None:
    token = connect(signed_in("alice@example.com"))["access_token"]
    with TestClient(app) as mcp:
        allow(monkeypatch, "alice@example.com")
        assert not call(mcp, token, "jokebox_overview").get("isError")
        allow(monkeypatch, "bob@example.com")
        refused = call(mcp, token, "jokebox_overview")
        assert refused["isError"] is True
        assert "Connect it again" in refused["content"][0]["text"]
