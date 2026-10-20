"""Alembic runs migrations against DATABASE_URL from app settings."""

from alembic import context
from app.config import get_settings
from app.db import build_engine
from app.models import Base

target_metadata = Base.metadata


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
            context.run_migrations()


run_migrations()
