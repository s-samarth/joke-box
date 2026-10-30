"""Who a tool call is for, and the database session it reads with."""

import uuid
from collections.abc import Iterator
from contextlib import contextmanager

from mcp.server.auth.middleware.auth_context import get_access_token
from mcp.server.mcpserver.exceptions import ToolError
from sqlalchemy.orm import Session, sessionmaker

from app.db import SessionLocal
from app.models import User

sessions: sessionmaker[Session] = SessionLocal


def use_sessions(factory: sessionmaker[Session]) -> None:
    """Point the tools at another database (the tests' one)."""
    global sessions
    sessions = factory


def caller(db: Session) -> User:
    """The user whose access token came with this request (set by the bearer-token check)."""
    token = get_access_token()
    user = db.get(User, uuid.UUID(token.subject)) if token and token.subject else None
    if user is None:
        raise PermissionError("Not signed in to JokeBox. Connect it again from Claude.")
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
