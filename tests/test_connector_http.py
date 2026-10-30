"""The connector over HTTP, the way Claude talks to it: MCP's streamable HTTP, stateless JSON,
with an access token. Everything here is made up."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.connector import http
from app.main import app
from tests.conftest import signed_in
from tests.connector_auth import call, connect, rpc
from tests.test_jokes import put_joke


@pytest.fixture
def mcp() -> Iterator[TestClient]:
    """A client with the app's lifespan running (the connector starts there)."""
    with TestClient(app) as client:
        yield client


def test_handshake_and_tool_list(mcp: TestClient) -> None:
    token = connect(signed_in("dev@example.com"))["access_token"]
    hello = {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "t"}}
    response = rpc(mcp, token, "initialize", hello | {"clientInfo": {"name": "t", "version": "1"}})
    assert response.json()["result"]["serverInfo"]["name"] == "JokeBox"
    tools = rpc(mcp, token, "tools/list").json()["result"]["tools"]
    assert "search_jokes" in {t["name"] for t in tools}
    assert all(t["annotations"]["readOnlyHint"] for t in tools)


def test_each_token_reads_only_its_own_jokebox(mcp: TestClient) -> None:
    dev, alice = signed_in("dev@example.com"), signed_in("alice@example.com")
    put_joke(dev, setup="Fake dev joke")
    put_joke(alice, setup="Fake alice joke")
    for browser, setup in ((dev, "Fake dev joke"), (alice, "Fake alice joke")):
        result = call(mcp, connect(browser)["access_token"], "search_jokes", query="fake")
        assert [j["setup"] for j in result["structuredContent"]["jokes"]] == [setup]


def test_a_missing_item_is_a_tool_error(mcp: TestClient) -> None:
    token = connect(signed_in("dev@example.com"))["access_token"]
    result = call(mcp, token, "get_premise", premise_id="not-an-id")
    assert result["isError"] is True
    assert "isn't a JokeBox id" in result["content"][0]["text"]


def test_no_token_points_claude_at_sign_in(mcp: TestClient) -> None:
    response = rpc(mcp, None, "tools/list")
    assert response.status_code == 401
    challenge = response.headers["www-authenticate"]
    assert "/.well-known/oauth-protected-resource/mcp" in challenge
    assert rpc(mcp, "fake-token", "tools/list").status_code == 401


def test_discovery_documents(mcp: TestClient) -> None:
    resource = mcp.get("/.well-known/oauth-protected-resource/mcp").json()
    assert resource["resource"] == "http://localhost:8000/mcp"
    assert resource["authorization_servers"] == ["http://localhost:8000"]
    server = mcp.get("/.well-known/oauth-authorization-server").json()
    assert server["issuer"] == "http://localhost:8000"
    assert server["registration_endpoint"] == "http://localhost:8000/register"
    assert server["code_challenge_methods_supported"] == ["S256"]


def test_deployed_it_answers_on_its_own_domain(monkeypatch: pytest.MonkeyPatch) -> None:
    """Locally only localhost may call /mcp; deployed, the real domain must get through (the
    SDK refused it once, as 'Invalid Host header', when nothing said we weren't local)."""
    token = connect(signed_in("dev@example.com"))["access_token"]
    deployed = Settings(app_env="production", public_url="https://jokebox.example")
    monkeypatch.setattr(http, "get_settings", lambda: deployed)
    with TestClient(app, base_url="https://jokebox.example") as client:
        assert rpc(client, token, "tools/list").status_code == 200
    monkeypatch.undo()
    with TestClient(app, base_url="https://jokebox.example") as client:
        assert (
            rpc(client, token, "tools/list").status_code == 421
        )  # locally, foreign hosts are refused
