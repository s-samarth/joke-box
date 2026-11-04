"""Alembic runs migrations against DATABASE_URL from app settings."""

from alembic import context
from app.config import get_settings
from app.db import build_engine
from app.models import Base

target_metadata = Base.metadata
LOCK_TIMEOUT = "5s"
STATEMENT_TIMEOUT = "2min"


def run_migrations() -> None:
    url = context.config.attributes.get("url") or get_settings().database_url
    engine = build_engine(url)
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # SQLite can't ALTER most things in place; batch mode rebuilds the table instead.
            render_as_batch=connection.dialect.name == "sqlite",
            compare_type=True,
        )
        with context.begin_transaction():
            if connection.dialect.name == "postgresql":
                # Migrations run on production during the Vercel build. A migration waiting on
                # a lock makes every request behind it wait too, so give up (and fail the
                # build, leaving the old deployment serving) rather than queue for long.
                connection.exec_driver_sql(f"SET LOCAL lock_timeout = '{LOCK_TIMEOUT}'")
                connection.exec_driver_sql(f"SET LOCAL statement_timeout = '{STATEMENT_TIMEOUT}'")
            context.run_migrations()


run_migrations()
