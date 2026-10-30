"""Serving the connector: /mcp behind a bearer token, and the OAuth endpoints that issue it.

/mcp speaks MCP's streamable HTTP transport, stateless with JSON replies: every request stands
alone, which suits serverless functions where no two requests are sure to reach the same
instance. The SDK's session manager runs a task group, so it's started in the app's lifespan;
a fresh one each time the app starts.

Sign-in is OAuth, the way Claude's custom connectors expect: a request without a token gets a
401 pointing at /.well-known/oauth-protected-resource/mcp, which names JokeBox as the
authorization server; Claude registers itself, sends you to /authorize (and on to the consent
page), and swaps the code for tokens at /token.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
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
from starlette.routing import Route
from starlette.types import ASGIApp, Receive, Scope, Send

from app.config import get_settings
from app.connector.consent import router as consent_router
from app.connector.oauth import SCOPE, Provider
from app.connector.server import server

PATH = "/mcp"
LOCAL_ORIGIN = "http://localhost:8000"


def origin() -> str | None:
    """Where JokeBox is served, which is also the OAuth issuer. None if it isn't known (a
    preview deployment without PUBLIC_URL), and then the connector isn't served."""
    settings = get_settings()
    if settings.public_url:
        return settings.public_url.rstrip("/")
    return LOCAL_ORIGIN if settings.is_local else None


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


def protected(resource: AnyHttpUrl, provider: Provider) -> ASGIApp:
    """/mcp, answering only requests with a live access token that has the read scope."""
    require = RequireAuthMiddleware(Endpoint(), [SCOPE], build_resource_metadata_url(resource))
    return AuthenticationMiddleware(
        AuthContextMiddleware(require), backend=BearerAuthBackend(ProviderTokenVerifier(provider))
    )


def install(app: FastAPI) -> None:
    """Add /mcp, the OAuth endpoints and the consent page to the app."""
    base = origin()
    if base is None:
        return
    provider = Provider()
    # Read through the SDK's settings, which keep a bare origin without a trailing slash: the
    # issuer is compared as an exact string, so "https://x/" wouldn't match "https://x".
    urls = AuthSettings.model_validate(
        {"issuer_url": base, "resource_server_url": base + PATH, "validate_token_resource": False}
    )
    issuer, resource = urls.issuer_url, AnyHttpUrl(str(urls.resource_server_url))
    registration = ClientRegistrationOptions(
        enabled=True, valid_scopes=[SCOPE], default_scopes=[SCOPE]
    )
    app.router.routes.extend(
        create_auth_routes(
            provider,
            issuer_url=issuer,
            client_registration_options=registration,
            revocation_options=RevocationOptions(enabled=True),
        )
    )
    app.router.routes.extend(create_protected_resource_routes(resource, [issuer], [SCOPE]))
    app.router.routes.append(Route(PATH, endpoint=protected(resource, provider)))
    app.include_router(consent_router)
