"""Google sign-in (OpenID Connect), sign-out, and a local-only dev sign-in."""

from authlib.integrations.starlette_client import OAuth, OAuthError
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from app.auth.bootstrap import upsert_user
from app.auth.deps import DbSession
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])
oauth = OAuth()
settings = get_settings()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile", "code_challenge_method": "S256"},
)


def safe_next(target: str | None) -> str:
    """Where to go after signing in: a path on this site only, never another site (an open
    redirect would let a link use our sign-in page to send you anywhere)."""
    if target and target.startswith("/") and not target.startswith("//") and "\\" not in target:
        return target
    return "/"


def callback_url(request: Request) -> str:
    """Absolute callback URL Google sends the user back to."""
    if settings.public_url:
        return settings.public_url.rstrip("/") + "/auth/google/callback"
    return str(request.url_for("google_callback"))


@router.get("/google/login")
async def google_login(request: Request, next: str = "") -> RedirectResponse:
    if not settings.google_client_id:
        raise HTTPException(503, "Google sign-in is not configured (GOOGLE_CLIENT_ID).")
    request.session["next"] = safe_next(next)
    response: RedirectResponse = await oauth.google.authorize_redirect(
        request, callback_url(request), prompt="select_account"
    )
    return response


@router.get("/google/callback", name="google_callback")
async def google_callback(request: Request, db: DbSession) -> RedirectResponse:
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError:
        return RedirectResponse("/login?error=failed", status_code=303)
    info = token.get("userinfo") or {}
    email = str(info.get("email", "")).lower()
    if not info.get("email_verified") or email not in settings.allowlist:
        request.session.clear()
        return RedirectResponse("/login?error=not_invited", status_code=303)
    user = upsert_user(
        db,
        email=email,
        google_sub=str(info["sub"]),
        name=str(info.get("name", "")),
        avatar=str(info.get("picture", "")),
    )
    target = safe_next(request.session.get("next"))
    request.session.clear()
    request.session["user_id"] = str(user.id)
    return RedirectResponse(target, status_code=303)


@router.post("/logout")
def logout(request: Request) -> dict[str, bool]:
    request.session.clear()
    return {"ok": True}


@router.get("/dev-login")
def dev_login(
    request: Request, db: DbSession, email: str = "dev@example.com", next: str = ""
) -> RedirectResponse:
    """Sign in without Google. Exists only when APP_ENV=local."""
    if not settings.is_local:
        raise HTTPException(404)
    user = upsert_user(db, email=email, google_sub=None, name="Dev Comic", avatar="")
    request.session.clear()
    request.session["user_id"] = str(user.id)
    return RedirectResponse(safe_next(next), status_code=303)
