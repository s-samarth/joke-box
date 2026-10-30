"""Connecting a test client the way Claude does: register, authorize, allow, swap the code."""

import base64
import hashlib
import re
import secrets
from typing import Any
from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient

CALLBACK = "https://claude.ai/api/mcp/auth_callback"
ACCEPT = {"Accept": "application/json, text/event-stream"}


def register(client: TestClient, redirect: str = CALLBACK) -> Any:
    body = {
        "redirect_uris": [redirect],
        "client_name": "Claude",
        "token_endpoint_auth_method": "none",
    }
    return client.post("/register", json=body)


def challenge_for(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()


def authorize(client: TestClient, client_id: str, verifier: str, state: str = "fake-state") -> str:
    """The consent page address /authorize sends the browser to."""
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": CALLBACK,
        "code_challenge": challenge_for(verifier),
        "code_challenge_method": "S256",
        "state": state,
        "scope": "read",
    }
    response = client.get("/authorize", params=params, follow_redirects=False)
    assert response.status_code in (302, 307), response.text
    return str(response.headers["location"])


def hidden(html: str, name: str) -> str:
    match = re.search(rf'name="{name}" value="([^"]*)"', html)
    assert match, html
    return match.group(1)


def allow(browser: TestClient, consent: str, decision: str = "allow") -> dict[str, list[str]]:
    """Open the consent page signed in, press a button, and read where it sends you."""
    html = browser.get(consent).text
    form = {
        "request": hidden(html, "request"),
        "check": hidden(html, "check"),
        "decision": decision,
    }
    response = browser.post("/oauth/consent", data=form, follow_redirects=False)
    assert response.status_code == 303, response.text
    target = urlparse(response.headers["location"])
    assert f"{target.scheme}://{target.netloc}{target.path}" == CALLBACK
    return parse_qs(target.query)


def swap_code(client: TestClient, client_id: str, code: str, verifier: str) -> Any:
    form = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": CALLBACK,
        "client_id": client_id,
        "code_verifier": verifier,
    }
    return client.post("/token", data=form)


def connect(browser: TestClient) -> dict[str, Any]:
    """The whole flow for the user signed in on `browser`: their tokens and the client id."""
    client_id = register(browser).json()["client_id"]
    verifier = secrets.token_urlsafe(48)
    code = allow(browser, authorize(browser, client_id, verifier))["code"][0]
    return {"client_id": client_id, **swap_code(browser, client_id, code, verifier).json()}


def rpc(
    client: TestClient, token: str | None, method: str, params: dict[str, Any] | None = None
) -> Any:
    headers = {**ACCEPT, "mcp-protocol-version": "2025-06-18"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params or {}}
    return client.post("/mcp", json=body, headers=headers)


def call(client: TestClient, token: str, tool: str, **arguments: Any) -> Any:
    response = rpc(client, token, "tools/call", {"name": tool, "arguments": arguments})
    assert response.status_code == 200, response.text
    return response.json()["result"]
