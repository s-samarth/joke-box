"""a version number on each joke, to catch edits made on two devices

A save says which version it was edited from. If the joke has moved on since (edited on another
device) and the save would change it, the server refuses instead of overwriting.

Revision ID: 0013
Revises: 0012
Create Date: 2026-10-22 16:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0013"
down_revision: str | Sequence[str] | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Every existing joke starts at version 1."""
    with op.batch_alter_table("bits") as batch:
        batch.add_column(sa.Column("version", sa.Integer(), nullable=False, server_default="1"))


def downgrade() -> None:
    with op.batch_alter_table("bits") as batch:
        batch.drop_column("version")
