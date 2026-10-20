"""handwriting pages

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-21 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004"
down_revision: str | Sequence[str] | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Count handwriting pages per session. Existing sessions have one page."""
    with op.batch_alter_table("writing_sessions", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("ink_pages", sa.Integer(), server_default="1", nullable=False)
        )


def downgrade() -> None:
    """Drop the page count. Strokes keep their page numbers but all show on one page."""
    with op.batch_alter_table("writing_sessions", schema=None) as batch_op:
        batch_op.drop_column("ink_pages")
