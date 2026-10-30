"""Who a tool call is for, and the database session it reads with."""

from collections.abc import Iterator
from contextlib import contextmanager

from mcp.server.mcpserver.exceptions import ToolError
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings
from app.db import SessionLocal
from app.models import User

sessions: sessionmaker[Session] = SessionLocal


def use_sessions(factory: sessionmaker[Session]) -> None:
    """Point the tools at another database (the tests' one)."""
    global sessions
    sessions = factory


def caller(db: Session) -> User:
    """The user the tools act for. Locally that's the dev sign-in's account; the connector
    isn't served anywhere else yet."""
    settings = get_settings()
    if not settings.is_local:
        raise PermissionError("The JokeBox connector isn't available here yet.")
    user = db.scalar(select(User).where(User.email == settings.connector_local_email.lower()))
    if user is None:
        raise PermissionError("Sign in once at /auth/dev-login so the connector has an account.")
    return user


@contextmanager
def reading() -> Iterator[tuple[Session, User]]:
    """A read-only session for one tool call, and the user it's for. A missing item or a bad
    id comes back to Claude as a tool error it can read, rather than a crash."""
    with sessions() as db:
        try:
            yield db, caller(db)
        except (ValueError, PermissionError) as exc:
            raise ToolError(str(exc)) from exc
        finally:
            db.rollback()
