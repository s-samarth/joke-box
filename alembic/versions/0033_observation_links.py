"""observations remember the premises and jokes that came from them

Two id lists on each observation, like a brainstorm's links: adding one to a premise's notes, or
starting a joke from it, puts that premise or joke here. Every observation starts with none.

Revision ID: 0033
Revises: 0032
Create Date: 2026-11-07 15:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0033"
down_revision: str | Sequence[str] | None = "0032"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("observations") as batch:
        batch.add_column(sa.Column("premise_ids", sa.JSON(), nullable=False, server_default="[]"))
        batch.add_column(sa.Column("joke_ids", sa.JSON(), nullable=False, server_default="[]"))


def downgrade() -> None:
    with op.batch_alter_table("observations") as batch:
        batch.drop_column("joke_ids")
        batch.drop_column("premise_ids")
