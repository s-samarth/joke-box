"""a version number on each set and brainstorm session, to catch edits made on two devices

Jokes have had one since 0013. A save says which version it was edited from; if the set or
session has moved on since (edited on another device) and the save would change it, the server
refuses instead of overwriting: a set's edit goes to Couldn't sync, a session's is kept as a copy.

Revision ID: 0030
Revises: 0029
Create Date: 2026-11-05 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0030"
down_revision: str | Sequence[str] | None = "0029"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = ("setlists", "writing_sessions")


def upgrade() -> None:
    """Every existing set and session starts at version 1."""
    for table in TABLES:
        with op.batch_alter_table(table) as batch:
            batch.add_column(sa.Column("version", sa.Integer(), nullable=False, server_default="1"))


def downgrade() -> None:
    for table in TABLES:
        with op.batch_alter_table(table) as batch:
            batch.drop_column("version")
