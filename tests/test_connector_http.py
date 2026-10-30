"""The connector over HTTP, the way Claude talks to it: MCP's streamable HTTP, stateless JSON.
Everything here is made up."""

from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.connector import identity
from app.main import app
from tests.conftest import signed_in
from tests.test_jokes import put_joke

ACCEPT = {"Accept": "application/json, text/event-stream"}


@pytest.fixture
def mcp(session_factory: sessionmaker[Session]) -> Iterator[TestClient]:
    """A client with the app's lifespan running (the connector starts there)."""
    identity.use_sessions(session_factory)
    with TestClient(app, headers=ACCEPT) as client:
        yield client
    identity.use_sessions(identity.SessionLocal)


def rpc(
    client: TestClient, method: str, params: dict[str, Any] | None = None, **headers: str
) -> Any:
    body = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params or {}}
    response = client.post("/mcp", json=body, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def call(client: TestClient, tool: str, **arguments: Any) -> Any:
    return rpc(
        client,
        "tools/call",
        {"name": tool, "arguments": arguments},
        **{"mcp-protocol-version": "2025-06-18"},
    )["result"]


def test_handshake_and_tool_list(mcp: TestClient) -> None:
    hello = rpc(
        mcp,
        "initialize",
        {
            "protocolVersion": "2025-06-18",
            "capabilities": {},
            "clientInfo": {"name": "t", "version": "1"},
        },
    )
    assert hello["result"]["serverInfo"]["name"] == "JokeBox"
    tools = rpc(mcp, "tools/list", **{"mcp-protocol-version": "2025-06-18"})["result"]["tools"]
    assert "search_jokes" in {t["name"] for t in tools}
    assert all(t["annotations"]["readOnlyHint"] for t in tools)


def test_a_tool_call_reads_the_dev_account(mcp: TestClient) -> None:
    dev = signed_in("dev@example.com")
    put_joke(dev, setup="Fake connector joke")
    put_joke(signed_in("alice@example.com"), setup="Fake someone else's")
    result = call(mcp, "search_jokes", query="fake")
    assert [j["setup"] for j in result["structuredContent"]["jokes"]] == ["Fake connector joke"]


def test_a_missing_item_is_a_tool_error(mcp: TestClient) -> None:
    signed_in("dev@example.com")
    result = call(mcp, "get_premise", premise_id="not-an-id")
    assert result["isError"] is True
    assert "isn't a JokeBox id" in result["content"][0]["text"]


def test_no_account_yet_says_how_to_fix_it(mcp: TestClient) -> None:
    result = call(mcp, "jokebox_overview")
    assert result["isError"] is True
    assert "dev-login" in result["content"][0]["text"]
