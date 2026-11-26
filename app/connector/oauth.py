"""JokeBox as an OAuth server for the connector, plugged into the MCP SDK's OAuth endpoints.

The SDK serves /register, /authorize, /token and /revoke and checks the protocol (PKCE, the
redirect URL, client secrets, expiry). This class is the storage behind them. Sign-in itself
happens on the consent page (consent.py): /authorize sends the browser there, and the page
makes the code once you allow Claude in.
"""

import uuid
from collections.abc import Callable
from functools import partial
from urllib.parse import urlparse

import anyio.to_thread
from mcp.server.auth.provider import (
    AccessToken,
    AuthorizationCode,
    AuthorizationParams,
    OAuthAuthorizationServerProvider,
    RefreshToken,
    RegistrationError,
    TokenError,
)
from mcp.shared.auth import OAuthClientInformationFull, OAuthToken
from pydantic import AnyUrl

from app.connector.consent_link import consent_url
from app.connector.tokens import (
    find,
    forget,
    issue,
    load_client,
    save_client,
    spend_refresh,
    use_up,
)

SCOPE = "read"
# Logging shows. Only the set-review engine asks for it; Claude's own connector reads only.
SHOWS_SCOPE = "shows"
SCOPES = [SCOPE, SHOWS_SCOPE]
# Web apps' sign-in callbacks: Claude (claude.com is where it may move), ChatGPT and VS Code.
# Apps on your own computer may also use a loopback address (Claude Code, Gemini CLI, Codex
# CLI) or their own URL scheme such as cursor:// (RFC 8252). PKCE keeps those safe, and every
# sign-in still needs your yes on the consent page.
WEB_CALLBACKS = {
    "https://claude.ai/api/mcp/auth_callback",
    "https://claude.com/api/mcp/auth_callback",
    "https://chatgpt.com/connector_platform_oauth_redirect",
    "https://platform.openai.com/apps-manage/oauth",
    "https://vscode.dev/redirect",
}
LOOPBACK = {"localhost", "127.0.0.1", "::1"}
# Schemes a browser would run or read itself, never an app's own sign-in callback.
UNSAFE_SCHEMES = {"https", "http", "javascript", "data", "file", "blob", "about", "vbscript"}
# Anyone can register, so a registration is kept only if it's the size of a real one (Claude's
# is about 600 characters). Without a cap, each one could store megabytes in the database.
MAX_REGISTRATION = 4096
MAX_CLIENT_NAME = 100


def allowed_redirect(url: str) -> bool:
    parsed = urlparse(url)
    if url in WEB_CALLBACKS:
        return True
    if parsed.scheme == "http":
        return parsed.hostname in LOOPBACK
    # An app's own scheme (cursor://...) has a dot or a letter-only name and no credentials.
    return bool(parsed.scheme) and parsed.scheme not in UNSAFE_SCHEMES and "@" not in url


async def run[T](fn: Callable[[], T]) -> T:
    """Database work off the event loop: the ORM is synchronous."""
    return await anyio.to_thread.run_sync(fn)


class Provider(OAuthAuthorizationServerProvider[AuthorizationCode, RefreshToken, AccessToken]):
    """The SDK's provider, backed by the two connector tables. The enterprise identity-assertion
    grant keeps the SDK's default, which refuses it."""

    async def get_client(self, client_id: str) -> OAuthClientInformationFull | None:
        return await run(partial(load_client, client_id))

    async def register_client(self, client_info: OAuthClientInformationFull) -> None:
        redirects = [str(u) for u in client_info.redirect_uris or []]
        if not redirects or not all(allowed_redirect(u) for u in redirects):
            raise RegistrationError(
                "invalid_redirect_uri", "That sign-in address isn't one JokeBox accepts."
            )
        too_long_name = len(client_info.client_name or "") > MAX_CLIENT_NAME
        if too_long_name or len(client_info.model_dump_json()) > MAX_REGISTRATION:
            raise RegistrationError("invalid_client_metadata", "That registration is too large.")
        await run(partial(save_client, client_info))

    async def authorize(
        self, client: OAuthClientInformationFull, params: AuthorizationParams
    ) -> str:
        return consent_url(client.client_id, params)

    async def load_authorization_code(
        self, client: OAuthClientInformationFull, authorization_code: str
    ) -> AuthorizationCode | None:
        row = await run(partial(find, authorization_code, "code", client.client_id))
        if row is None:
            return None
        return AuthorizationCode(
            code=authorization_code,
            scopes=row.scopes,
            expires_at=row.expires_at.timestamp(),
            client_id=row.client_id,
            code_challenge=row.details["code_challenge"],
            redirect_uri=AnyUrl(row.details["redirect_uri"]),
            redirect_uri_provided_explicitly=row.details["redirect_uri_provided_explicitly"],
            resource=row.details.get("resource"),
            subject=str(row.user_id),
        )

    async def exchange_authorization_code(
        self, client: OAuthClientInformationFull, authorization_code: AuthorizationCode
    ) -> OAuthToken:
        if not await run(partial(use_up, authorization_code.code, "code")):
            raise TokenError("invalid_grant", "This sign-in code was already used.")
        user_id = uuid.UUID(str(authorization_code.subject))
        return await run(partial(issue, user_id, client.client_id, authorization_code.scopes))

    async def load_refresh_token(
        self, client: OAuthClientInformationFull, refresh_token: str
    ) -> RefreshToken | None:
        row = await run(partial(find, refresh_token, "refresh", client.client_id))
        if row is None:
            return None
        expires = int(row.expires_at.timestamp())
        subject = str(row.user_id)
        return RefreshToken(
            token=refresh_token,
            client_id=row.client_id,
            scopes=row.scopes,
            expires_at=expires,
            subject=subject,
        )

    async def exchange_refresh_token(
        self, client: OAuthClientInformationFull, refresh_token: RefreshToken, scopes: list[str]
    ) -> OAuthToken:
        if not await run(partial(spend_refresh, refresh_token.token)):
            raise TokenError("invalid_grant", "This refresh token was already used.")
        user_id = uuid.UUID(str(refresh_token.subject))
        return await run(partial(issue, user_id, client.client_id, scopes or refresh_token.scopes))

    async def load_access_token(self, token: str) -> AccessToken | None:
        row = await run(partial(find, token, "access"))
        if row is None:
            return None
        expires = int(row.expires_at.timestamp())
        return AccessToken(
            token=token,
            client_id=row.client_id,
            scopes=row.scopes,
            expires_at=expires,
            subject=str(row.user_id),
        )

    async def revoke_token(self, token: AccessToken | RefreshToken) -> None:
        if token.subject:
            await run(partial(forget, uuid.UUID(token.subject), token.client_id))
