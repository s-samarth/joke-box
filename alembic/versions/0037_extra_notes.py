"""premises and observations get a box for anything else worth keeping

A premise's `notes` hold why the take is true; `extra_notes` is a separate box for everything
else. Observations had no notes at all. Both start empty.

Revision ID: 0037
Revises: 0036
Create Date: 2026-11-12 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0037"
down_revision: str | Sequence[str] | None = "0036"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = ("premises", "observations")


def upgrade() -> None:
    for table in TABLES:
        with op.batch_alter_table(table) as batch:
            batch.add_column(sa.Column("extra_notes", sa.Text(), nullable=False, server_default=""))


def downgrade() -> None:
    for table in TABLES:
        with op.batch_alter_table(table) as batch:
            batch.drop_column("extra_notes")
