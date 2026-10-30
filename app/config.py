"""Settings read from environment variables (and a local .env file)."""

import os
from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All runtime configuration. Production values live in Vercel's environment settings."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: Literal["local", "preview", "production"] = "local"
    database_url: str = "sqlite:///./jokebox.db"
    session_secret: str = "local-dev-secret-change-me"
    # Comma-separated Google accounts allowed to sign in.
    allowed_emails: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    # Public origin, e.g. https://jokebox.samarthsaraswat.com. Used for the OAuth redirect.
    public_url: str = ""
    app_version: str = "dev"
    # Local development keeps voice-note audio here; on Vercel it goes to a private Blob store.
    audio_dir: str = ".voice-notes"

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, value: str) -> str:
        """Neon and Vercel hand out postgres:// URLs; SQLAlchemy needs the psycopg driver name."""
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value.removeprefix(prefix)
        return value

    @property
    def is_local(self) -> bool:
        return self.app_env == "local"

    @property
    def allowlist(self) -> set[str]:
        return {e.strip().lower() for e in self.allowed_emails.split(",") if e.strip()}

    def check_production_safety(self) -> None:
        """Refuse to start a deployed app with the default secret or the local SQLite file."""
        if self.is_local:
            # Vercel sets VERCEL=1. Local mode there would expose the dev sign-in to the internet.
            if os.environ.get("VERCEL"):
                raise RuntimeError("Set APP_ENV to 'production' or 'preview' on Vercel.")
            return
        if self.session_secret == "local-dev-secret-change-me" or len(self.session_secret) < 32:
            raise RuntimeError("SESSION_SECRET must be set to a random value of 32+ characters.")
        if self.database_url.startswith("sqlite"):
            raise RuntimeError("DATABASE_URL must point at Postgres outside local development.")


@lru_cache
def get_settings() -> Settings:
    """Settings are read once per process."""
    return Settings()
