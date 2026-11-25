"""The connector's addresses, loaded on their first request instead of when the app starts.

Vercel bills the CPU a server copy spends starting up, and the app starts a fresh copy after a
few minutes idle, often several at once (one per list the app asks for at launch). Importing
the MCP SDK and the OAuth code took about half of each start, though almost every request is
the app's own. So the app only learns the connector's paths here; the first request to one of
them loads `app.connector.http` (on that server copy only), and every later one goes straight
through. Nothing changes for Claude, which pays that cost on its first call, as it did before.

The MCP session manager needs a task group that outlives a request, so the app's lifespan
keeps one open (`lifespan`), and http.py starts the manager in it on the first /mcp call.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import anyio
from anyio.abc import TaskGroup
from fastapi import FastAPI
from starlette.routing import Route
from starlette.types import ASGIApp, Receive, Scope, Send

from app.config import get_settings

LOCAL_ORIGIN = "http://localhost:8000"
MCP_PATH = "/mcp"
CONSENT_PATH = "/oauth/consent"  # consent_link.CONSENT_PATH; a test keeps them the same
# Every path http.build() serves; a test checks the two lists match.
PATHS = (
    "/.well-known/oauth-authorization-server",
    "/.well-known/oauth-protected-resource/mcp",
    "/authorize",
    "/token",
    "/register",
    "/revoke",
    MCP_PATH,
    CONSENT_PATH,
)


def origin() -> str | None:
    """Where JokeBox is served, which is also the OAuth issuer. None if it isn't known (a
    preview deployment without PUBLIC_URL), and then the connector isn't served."""
    settings = get_settings()
    if settings.public_url:
        return settings.public_url.rstrip("/")
    return LOCAL_ORIGIN if settings.is_local else None


class Background:
    """The task group the app's lifespan holds open, for the MCP session manager."""

    tasks: TaskGroup | None = None
    lock: anyio.Lock | None = None  # one /mcp call starts the session manager, not two


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    # One line per server copy started, so the runtime logs show how many cold starts ran.
    print("JokeBox server started", flush=True)
    async with anyio.create_task_group() as tasks:
        Background.tasks, Background.lock = tasks, anyio.Lock()
        try:
            yield
        finally:
            Background.tasks = Background.lock = None
            tasks.cancel_scope.cancel()


class Connector:
    """A plain ASGI app standing in for the connector until its first request loads it."""

    def __init__(self) -> None:
        self.loaded: ASGIApp | None = None

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if self.loaded is None:
            from app.connector import http  # noqa: PLC0415  (the point of this module)

            self.loaded = http.build(scope["app"])
        await self.loaded(scope, receive, send)


def install(app: FastAPI) -> None:
    """Add the connector's paths to the app, each loading the connector when first called."""
    if origin() is None:
        return
    connector = Connector()
    app.router.routes.extend(Route(path, endpoint=connector) for path in PATHS)
