"""a version number on each Craft note, observation and premise, to catch edits made on two devices

Jokes have had one since 0013, sets and brainstorm sessions since 0030. An edit made from an older
version that would change something is refused, and waits in Couldn't sync with Keep mine.

Revision ID: 0031
Revises: 0030
Create Date: 2026-11-05 18:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0031"
down_revision: str | Sequence[str] | None = "0030"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = ("craft_notes", "observations", "premises")


def upgrade() -> None:
    """Every existing note, observation and premise starts at version 1."""
    for table in TABLES:
        with op.batch_alter_table(table) as batch:
            batch.add_column(sa.Column("version", sa.Integer(), nullable=False, server_default="1"))


def downgrade() -> None:
    for table in TABLES:
        with op.batch_alter_table(table) as batch:
            batch.drop_column("version")
