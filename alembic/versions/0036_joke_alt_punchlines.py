"""jokes keep the other punchlines tried for the same setup

A list of lines on each joke, beside the punchline in use, so trying another ending never means
losing the one you had. Every joke starts with none.

Revision ID: 0036
Revises: 0035
Create Date: 2026-11-11 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0036"
down_revision: str | Sequence[str] | None = "0035"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("jokes") as batch:
        batch.add_column(
            sa.Column("alt_punchlines", sa.JSON(), nullable=False, server_default="[]")
        )


def downgrade() -> None:
    with op.batch_alter_table("jokes") as batch:
        batch.drop_column("alt_punchlines")
