"""The consent page: where you sign in and allow Claude to read your JokeBox.

A plain server-rendered page rather than a screen in the React app: it's one form, it must work
without the app's offline cache, and it never needs the app's JavaScript.
"""

import hashlib
import hmac
import uuid
from urllib.parse import quote

from fastapi import APIRouter, Form, Query, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from mcp.server.auth.provider import construct_redirect_uri

from app.auth.deps import DbSession
from app.config import get_settings
from app.connector.consent_link import CONSENT_PATH, Pending, read_pending
from app.connector.consent_page import EXPIRED, page
from app.connector.tokens import load_client, store
from app.models import User

router = APIRouter(tags=["connector"])


def form_token(user_id: str, request_token: str) -> str:
    """Ties the form to the signed-in user and this request, so another site can't post it."""
    key = get_settings().session_secret.encode()
    return hmac.new(key, f"{user_id}:{request_token}".encode(), hashlib.sha256).hexdigest()


def signed_in(request: Request, db: DbSession) -> User | None:
    raw = request.session.get("user_id")
    return db.get(User, uuid.UUID(raw)) if raw else None


def sign_in_first(request: Request) -> RedirectResponse:
    """Off to sign in, then straight back here."""
    back = quote(f"{CONSENT_PATH}?{request.url.query}", safe="")
    start = "/auth/dev-login" if get_settings().is_local else "/auth/google/login"
    return RedirectResponse(f"{start}?next={back}", status_code=303)


@router.get(CONSENT_PATH, response_class=HTMLResponse)
def show_consent(
    request: Request, db: DbSession, token: str = Query(default="", alias="request")
) -> Response:
    pending = read_pending(token)
    if pending is None:
        return HTMLResponse(EXPIRED, status_code=400)
    user = signed_in(request, db)
    if user is None:
        return sign_in_first(request)
    client = load_client(pending.client_id)
    name = (client.client_name if client else None) or "An app"
    return HTMLResponse(page(name, user.email, token, form_token(str(user.id), token)))


def answer(pending: Pending, **params: str | None) -> RedirectResponse:
    target = construct_redirect_uri(pending.redirect_uri, state=pending.state, **params)
    return RedirectResponse(target, status_code=303)


@router.post(CONSENT_PATH)
def decide(
    request: Request,
    db: DbSession,
    request_token: str = Form(alias="request"),
    check: str = Form(),
    decision: str = Form(),
) -> Response:
    pending = read_pending(request_token)
    user = signed_in(request, db)
    if pending is None or user is None:
        return HTMLResponse(EXPIRED, status_code=400)
    if not hmac.compare_digest(check, form_token(str(user.id), request_token)):
        return HTMLResponse(EXPIRED, status_code=400)
    if decision != "allow":
        return answer(pending, error="access_denied")
    code = store(
        user.id,
        pending.client_id,
        "code",
        pending.scopes,
        code_challenge=pending.code_challenge,
        redirect_uri=pending.redirect_uri,
        redirect_uri_provided_explicitly=pending.redirect_uri_provided_explicitly,
        resource=pending.resource,
    )
    return answer(pending, code=code)
