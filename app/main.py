"""The FastAPI app. Vercel finds `app` here; locally run `uv run uvicorn app.main:app --reload`."""

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.middleware.sessions import SessionMiddleware

from app.auth.routes import router as auth_router
from app.config import get_settings
from app.routers import (
    analyses,
    bits,
    observations,
    sessions,
    shows,
    studio,
    system,
    topics,
    voice,
    watchlist,
)

THIRTY_DAYS = 60 * 60 * 24 * 30
WEB_DIST = Path(__file__).resolve().parent.parent / "web" / "dist"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


async def require_csrf_header(request: Request, call_next: RequestResponseEndpoint) -> Response:
    """Changes to /api must come from our own frontend.

    Browsers won't let another site add a custom header to a cross-site request without a
    CORS preflight (which we never allow), so this header plus SameSite=Lax cookies blocks CSRF.
    """
    if (
        request.url.path.startswith("/api/")
        and request.method not in SAFE_METHODS
        and request.headers.get("x-requested-with") != "jokebox"
    ):
        return JSONResponse({"detail": "Missing X-Requested-With header"}, status_code=403)
    return await call_next(request)


def create_app() -> FastAPI:
    settings = get_settings()
    settings.check_production_safety()
    app = FastAPI(title="JokeBox", docs_url="/api/docs" if settings.is_local else None)
    app.add_middleware(BaseHTTPMiddleware, dispatch=require_csrf_header)
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_secret,
        session_cookie="jokebox_session",
        max_age=THIRTY_DAYS,
        same_site="lax",
        https_only=not settings.is_local,
    )
    routers = (
        system,
        topics,
        bits,
        studio,
        shows,
        observations,
        sessions,
        voice,
        watchlist,
        analyses,
    )
    for module in routers:
        app.include_router(module.router)
    app.include_router(auth_router)
    # The built React app. API routes always win; unknown page URLs get index.html.
    app.frontend("/", directory=WEB_DIST, fallback="index.html", check_dir=False)
    return app


app = create_app()
