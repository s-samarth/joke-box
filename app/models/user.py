"""A signed-in comedian. Created on first Google sign-in."""

from datetime import datetime

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, IdMixin, TimestampMixin, UTCDateTime


class User(IdMixin, TimestampMixin, Base):
    __tablename__ = "users"

    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True)
    email: Mapped[str] = mapped_column(String(320), unique=True)
    display_name: Mapped[str] = mapped_column(String(200), default="")
    avatar_url: Mapped[str] = mapped_column(String(1000), default="")
    plan: Mapped[str] = mapped_column(String(20), default="Pro")
    last_login_at: Mapped[datetime | None] = mapped_column(UTCDateTime())
