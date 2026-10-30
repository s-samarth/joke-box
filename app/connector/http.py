"""Serving the connector at /mcp, over MCP's streamable HTTP transport.

Stateless with JSON replies: every request stands alone, which suits serverless functions
where no two requests are sure to reach the same instance. The SDK's session manager runs a
task group, so it's started in the app's lifespan; a fresh one each time the app starts.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from mcp.server.transport_security import TransportSecuritySettings
from starlette.routing import Route
from starlette.types import Receive, Scope, Send

from app.config import get_settings
from app.connector.server import server

PATH = "/mcp"


def security() -> TransportSecuritySettings | None:
    """Locally, refuse requests from other sites (a web page can reach localhost)."""
    if not get_settings().is_local:
        return None
    return TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=["127.0.0.1:*", "localhost:*", "[::1]:*", "testserver"],
        allowed_origins=["http://127.0.0.1:*", "http://localhost:*", "http://[::1]:*"],
    )


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    server.streamable_http_app(
        stateless_http=True, json_response=True, transport_security=security()
    )
    async with server.session_manager.run():
        yield


class Endpoint:
    """A plain ASGI app (a class, so Starlette passes it the raw request), handing each
    request to the session manager running now."""

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        await server.session_manager.handle_request(scope, receive, send)


def install(app: FastAPI) -> None:
    """Add /mcp to the app. Only locally for now: there's no sign-in for it yet."""
    if get_settings().is_local:
        app.router.routes.append(
            Route(PATH, endpoint=Endpoint(), methods=["GET", "POST", "DELETE"])
        )
