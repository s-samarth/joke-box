"""Any MCP app can sign in, not only Claude: ChatGPT, Cursor (its own cursor:// scheme) and the
terminal tools on your computer (loopback). Each runs the whole flow through to a tool call."""

import secrets
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import signed_in
from tests.connector_auth import challenge_for, hidden, rpc

CALLBACKS = [
    ("ChatGPT", "https://chatgpt.com/connector_platform_oauth_redirect"),
    ("Cursor", "cursor://anysphere.cursor-mcp/oauth/callback"),
    ("Gemini CLI", "http://localhost:7777/oauth/callback"),
    ("Codex", "http://127.0.0.1:1455/callback"),
]


def sign_in(browser: TestClient, name: str, callback: str) -> str:
    body = {"redirect_uris": [callback], "client_name": name, "token_endpoint_auth_method": "none"}
    client_id = browser.post("/register", json=body).json()["client_id"]
    verifier = secrets.token_urlsafe(48)
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": callback,
        "code_challenge": challenge_for(verifier),
        "code_challenge_method": "S256",
        "state": "fake-state",
        "scope": "read",
    }
    consent = browser.get("/authorize", params=params, follow_redirects=False)
    html = browser.get(consent.headers["location"]).text
    assert f"Let {name} read your JokeBox?" in html
    form = {"request": hidden(html, "request"), "check": hidden(html, "check"), "decision": "allow"}
    back = browser.post("/oauth/consent", data=form, follow_redirects=False).headers["location"]
    assert back.startswith(callback + "?")
    code = parse_qs(urlparse(back).query)["code"][0]
    tokens = browser.post(
        "/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": callback,
            "client_id": client_id,
            "code_verifier": verifier,
        },
    )
    assert tokens.status_code == 200, tokens.text
    return str(tokens.json()["access_token"])


@pytest.mark.parametrize(("name", "callback"), CALLBACKS)
def test_each_app_signs_in_and_reads(name: str, callback: str) -> None:
    browser = signed_in("dev@example.com")
    token = sign_in(browser, name, callback)
    with TestClient(app) as mcp:
        listed = rpc(mcp, token, "tools/list")
    assert listed.status_code == 200
    assert any(t["name"] == "jokebox_overview" for t in listed.json()["result"]["tools"])


def test_a_code_cant_be_sent_to_another_apps_address() -> None:
    browser = signed_in("dev@example.com")
    body = {
        "redirect_uris": ["cursor://anysphere.cursor-mcp/oauth/callback"],
        "client_name": "Cursor",
        "token_endpoint_auth_method": "none",
    }
    client_id = browser.post("/register", json=body).json()["client_id"]
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": "cursor://someone-else/callback",
        "code_challenge": challenge_for(secrets.token_urlsafe(48)),
        "code_challenge_method": "S256",
        "state": "fake-state",
    }
    response = browser.get("/authorize", params=params, follow_redirects=False)
    assert response.status_code == 400
