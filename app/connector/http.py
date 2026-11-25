"""Serving the connector: /mcp behind a bearer token, and the OAuth endpoints that issue it.

/mcp speaks MCP's streamable HTTP transport, stateless with JSON replies: every request stands
alone, which suits serverless functions where no two requests are sure to reach the same
instance. The SDK's session manager runs a task group, so the first /mcp call starts it in the
task group the app's lifespan holds open (lazy.py); a fresh one each time the app starts.

Nothing imports this module when the app starts: lazy.py loads it on the first request to one
of the connector's paths, since loading the MCP SDK was half the CPU of every cold start.

Sign-in is OAuth, the way Claude's custom connectors expect: a request without a token gets a
401 pointing at /.well-known/oauth-protected-resource/mcp, which names JokeBox as the
authorization server; Claude registers itself, sends you to /authorize (and on to the consent
page), and swaps the code for tokens at /token.
"""

import anyio
from anyio.abc import TaskStatus
from fastapi import APIRouter, FastAPI
from mcp.server.auth.middleware.auth_context import AuthContextMiddleware
from mcp.server.auth.middleware.bearer_auth import BearerAuthBackend, RequireAuthMiddleware
from mcp.server.auth.provider import ProviderTokenVerifier
from mcp.server.auth.routes import (
    build_resource_metadata_url,
    create_auth_routes,
    create_protected_resource_routes,
)
from mcp.server.auth.settings import AuthSettings, ClientRegistrationOptions, RevocationOptions
from mcp.server.transport_security import TransportSecuritySettings
from pydantic import AnyHttpUrl
from starlette.middleware.authentication import AuthenticationMiddleware
from starlette.responses import Response
from starlette.routing import Route
from starlette.types import ASGIApp, Receive, Scope, Send

from app.config import get_settings
from app.connector import server as tools  # noqa: F401  (registers every tool)
from app.connector.base import server
from app.connector.consent import router as consent_router
from app.connector.lazy import MCP_PATH as PATH
from app.connector.lazy import Background, origin
from app.connector.oauth import SCOPE, SCOPES, Provider


def security() -> TransportSecuritySettings:
    """Locally, refuse requests from other sites: a web page can reach localhost (DNS
    rebinding). Deployed, every request needs an access token, which is the real protection,
    so the host check is off. It must be said explicitly: left unset, the SDK assumes it's on
    localhost and refuses every other host, which turned Claude away from the real domain."""
    if not get_settings().is_local:
        return TransportSecuritySettings(enable_dns_rebinding_protection=False)
    return TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=["127.0.0.1:*", "localhost:*", "[::1]:*", "testserver"],
        allowed_origins=["http://127.0.0.1:*", "http://localhost:*", "http://[::1]:*"],
    )


class Manager:
    """Whether the session manager is running in the lifespan's task group now."""

    running = False


async def serve(*, task_status: TaskStatus[None] = anyio.TASK_STATUS_IGNORED) -> None:
    """Run a fresh session manager until the lifespan's task group is cancelled."""
    server.streamable_http_app(
        stateless_http=True, json_response=True, transport_security=security()
    )
    try:
        async with server.session_manager.run():
            Manager.running = True
            task_status.started()
            await anyio.sleep_forever()
    finally:
        Manager.running = False


async def start_manager() -> None:
    """Start the session manager on this server copy's first /mcp call."""
    if Manager.running:
        return
    tasks, lock = Background.tasks, Background.lock
    if tasks is None or lock is None:
        raise RuntimeError("The app's lifespan isn't running, so /mcp can't be served")
    async with lock:
        if not Manager.running:
            await tasks.start(serve)


class Endpoint:
    """A plain ASGI app (a class, so Starlette passes it the raw request), handing each
    request to the session manager running now.

    Only POST is answered. A GET asks for a stream of server messages, which a stateless
    server never sends, so the SDK would hold it open until the function timed out."""

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["method"] != "POST":
            await Response(status_code=405, headers={"Allow": "POST"})(scope, receive, send)
            return
        await start_manager()
        await server.session_manager.handle_request(scope, receive, send)


def protected(resource: AnyHttpUrl, provider: Provider) -> ASGIApp:
    """/mcp, answering only requests with a live access token that has the read scope."""
    require = RequireAuthMiddleware(Endpoint(), [SCOPE], build_resource_metadata_url(resource))
    return AuthenticationMiddleware(
        AuthContextMiddleware(require), backend=BearerAuthBackend(ProviderTokenVerifier(provider))
    )


def build(app: FastAPI) -> ASGIApp:
    """/mcp, the OAuth endpoints and the consent page, served at lazy.PATHS. The consent
    page's dependencies follow the app's overrides (tests swap the database)."""
    base = origin()
    if base is None:
        raise RuntimeError("The connector isn't served without PUBLIC_URL")
    provider = Provider()
    # Read through the SDK's settings, which keep a bare origin without a trailing slash: the
    # issuer is compared as an exact string, so "https://x/" wouldn't match "https://x".
    urls = AuthSettings.model_validate(
        {"issuer_url": base, "resource_server_url": base + PATH, "validate_token_resource": False}
    )
    issuer, resource = urls.issuer_url, AnyHttpUrl(str(urls.resource_server_url))
    registration = ClientRegistrationOptions(
        enabled=True, valid_scopes=SCOPES, default_scopes=[SCOPE]
    )
    router = APIRouter(dependency_overrides_provider=app)
    router.routes.extend(
        create_auth_routes(
            provider,
            issuer_url=issuer,
            client_registration_options=registration,
            revocation_options=RevocationOptions(enabled=True),
        )
    )
    router.routes.extend(create_protected_resource_routes(resource, [issuer], SCOPES))
    router.routes.append(Route(PATH, endpoint=protected(resource, provider)))
    router.include_router(consent_router)
    return router
