"""Health check, the signed-in profile, and the local-only reseed button."""

from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from app.auth.deps import CurrentUser, DbSession
from app.config import get_settings
from app.schemas.shows import MeOut
from app.seed import reseed

router = APIRouter(tags=["system"])


@router.get("/health")
def health(db: DbSession) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    settings = get_settings()
    return {"status": "ok", "env": settings.app_env, "version": settings.app_version}


@router.get("/api/me", response_model=MeOut)
def me(user: CurrentUser) -> MeOut:
    return MeOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        plan=user.plan,
        env=get_settings().app_env,
    )


@router.post("/api/dev/reseed", status_code=204)
def dev_reseed(user: CurrentUser, db: DbSession) -> None:
    """Wipe and reload demo data. Exists only when APP_ENV=local."""
    if not get_settings().is_local:
        raise HTTPException(404)
    reseed(db, user)
