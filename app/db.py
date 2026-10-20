"""Database engine and the per-request session dependency."""

from collections.abc import Iterator

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.config import get_settings


def build_engine(url: str) -> Engine:
    """SQLite locally (foreign keys switched on); Postgres on Vercel without a pool.

    Serverless functions are short-lived, so each request opens a connection through
    Neon's pooler instead of keeping a pool of its own.
    """
    if url.startswith("sqlite"):
        engine = create_engine(url, connect_args={"check_same_thread": False})

        @event.listens_for(engine, "connect")
        def _enable_foreign_keys(dbapi_conn, _record):  # type: ignore[no-untyped-def]
            dbapi_conn.execute("PRAGMA foreign_keys=ON")

        return engine
    return create_engine(url, poolclass=NullPool, pool_pre_ping=True)


engine = build_engine(get_settings().database_url)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """Yield a session for one request; roll back if the request fails."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
