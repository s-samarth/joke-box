"""Signing Claude in to JokeBox: registration, consent, codes, refresh, and disconnecting.
Everything here is made up."""

import secrets
from datetime import timedelta
from urllib.parse import unquote

from fastapi.testclient import TestClient
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.auth.routes import safe_next
from app.main import app
from app.models import ConnectorToken
from app.models.base import utcnow
from tests.conftest import signed_in
from tests.connector_auth import allow, authorize, connect, register, rpc, swap_code


def test_only_claude_and_loopback_callbacks_can_register() -> None:
    client = TestClient(app)
    assert register(client).status_code == 201
    assert register(client, "http://localhost:33418/callback").status_code == 201
    refused = register(client, "https://fake-attacker.example/callback")
    assert refused.status_code == 400
    assert refused.json()["error"] == "invalid_redirect_uri"


def test_consent_asks_you_to_sign_in_first() -> None:
    stranger = TestClient(app)
    client_id = register(stranger).json()["client_id"]
    consent = authorize(stranger, client_id, secrets.token_urlsafe(48))
    response = stranger.get(consent, follow_redirects=False)
    assert response.status_code == 303
    assert response.headers["location"].startswith("/auth/dev-login?next=%2Foauth%2Fconsent")
    signed = stranger.get(response.headers["location"], follow_redirects=False)
    assert signed.headers["location"].startswith("/oauth/consent?request=")


def test_the_page_says_who_and_what() -> None:
    browser = signed_in("dev@example.com")
    client_id = register(browser).json()["client_id"]
    page = browser.get(authorize(browser, client_id, secrets.token_urlsafe(48))).text
    assert "Let Claude read your JokeBox?" in page
    assert "dev@example.com" in page
    assert "can't change or delete anything" in page


def test_full_flow_gives_tokens_once() -> None:
    browser = signed_in("dev@example.com")
    client_id = register(browser).json()["client_id"]
    verifier = secrets.token_urlsafe(48)
    answer = allow(browser, authorize(browser, client_id, verifier, state="fake-state"))
    assert answer["state"] == ["fake-state"]
    code = answer["code"][0]
    tokens = swap_code(browser, client_id, code, verifier)
    assert tokens.status_code == 200
    assert tokens.json()["token_type"].lower() == "bearer"
    assert tokens.json()["expires_in"] == 3600
    reused = swap_code(browser, client_id, code, verifier)
    assert reused.status_code == 400
    assert reused.json()["error"] == "invalid_grant"


def test_the_code_needs_the_right_verifier() -> None:
    browser = signed_in("dev@example.com")
    client_id = register(browser).json()["client_id"]
    code = allow(browser, authorize(browser, client_id, secrets.token_urlsafe(48)))["code"][0]
    wrong = swap_code(browser, client_id, code, secrets.token_urlsafe(48))
    assert wrong.status_code == 400


def test_dont_allow_sends_claude_access_denied() -> None:
    browser = signed_in("dev@example.com")
    client_id = register(browser).json()["client_id"]
    consent = authorize(browser, client_id, secrets.token_urlsafe(48))
    assert allow(browser, consent, decision="deny")["error"] == ["access_denied"]


def test_altered_links_and_forged_forms_are_refused() -> None:
    browser = signed_in("dev@example.com")
    assert browser.get("/oauth/consent?request=fake").status_code == 400
    client_id = register(browser).json()["client_id"]
    consent = authorize(browser, client_id, secrets.token_urlsafe(48))
    request_token = unquote(consent.split("request=", 1)[1])
    forged = {"request": request_token, "check": "fake", "decision": "allow"}
    assert browser.post("/oauth/consent", data=forged).status_code == 400


def refresh(client: TestClient, client_id: str, token: str) -> object:
    form = {"grant_type": "refresh_token", "refresh_token": token, "client_id": client_id}
    return client.post("/token", data=form)


def test_refresh_tokens_rotate() -> None:
    browser = signed_in("dev@example.com")
    first = connect(browser)
    renewed = refresh(browser, first["client_id"], first["refresh_token"])
    assert renewed.status_code == 200  # type: ignore[attr-defined]
    again = refresh(browser, first["client_id"], first["refresh_token"])
    assert again.status_code == 400  # type: ignore[attr-defined]


def test_disconnect_and_expiry_stop_access(db: Session) -> None:
    browser = signed_in("dev@example.com")
    with TestClient(app) as mcp:
        tokens = connect(browser)
        assert rpc(mcp, tokens["access_token"], "tools/list").status_code == 200
        [connection] = browser.get("/api/connections").json()
        assert connection["name"] == "Claude"
        assert browser.delete(f"/api/connections/{connection['client_id']}").status_code == 204
        assert browser.get("/api/connections").json() == []
        assert rpc(mcp, tokens["access_token"], "tools/list").status_code == 401

        later = connect(browser)
        db.execute(update(ConnectorToken).values(expires_at=utcnow() - timedelta(seconds=1)))
        db.commit()
        assert rpc(mcp, later["access_token"], "tools/list").status_code == 401


def test_someone_else_cannot_disconnect_your_claude() -> None:
    dev, alice = signed_in("dev@example.com"), signed_in("alice@example.com")
    tokens = connect(dev)
    alice.delete(f"/api/connections/{tokens['client_id']}")
    assert len(dev.get("/api/connections").json()) == 1


def test_sign_in_only_returns_to_this_site() -> None:
    assert safe_next("/oauth/consent?request=x") == "/oauth/consent?request=x"
    for bad in ("https://fake.example", "//fake.example", "/\\fake.example", "", None):
        assert safe_next(bad) == "/"
