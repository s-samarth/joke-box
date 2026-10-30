"""The link from Claude's sign-in request to the consent page, and back.

/authorize has checked the request (client, redirect URL, PKCE challenge). Rather than store it
while you sign in, it travels in the consent page's address, signed with the app secret so it
can't be altered, and good for 10 minutes.
"""

from dataclasses import asdict, dataclass
from urllib.parse import urlencode

from itsdangerous import BadSignature, URLSafeTimedSerializer
from mcp.server.auth.provider import AuthorizationParams

from app.config import get_settings

CONSENT_PATH = "/oauth/consent"
MAX_AGE = 600


@dataclass
class Pending:
    """A checked sign-in request, waiting for you to allow or deny it."""

    client_id: str
    redirect_uri: str
    redirect_uri_provided_explicitly: bool
    code_challenge: str
    state: str | None
    scopes: list[str]
    resource: str | None


def signer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(get_settings().session_secret, salt="connector-consent")


def consent_url(client_id: str, params: AuthorizationParams) -> str:
    pending = Pending(
        client_id=client_id,
        redirect_uri=str(params.redirect_uri),
        redirect_uri_provided_explicitly=params.redirect_uri_provided_explicitly,
        code_challenge=params.code_challenge,
        state=params.state,
        scopes=params.scopes or ["read"],
        resource=params.resource,
    )
    return f"{CONSENT_PATH}?{urlencode({'request': signer().dumps(asdict(pending))})}"


def read_pending(token: str) -> Pending | None:
    """The request behind a consent link, or None if it was altered or is too old."""
    try:
        return Pending(**signer().loads(token, max_age=MAX_AGE))
    except (BadSignature, TypeError):
        return None
