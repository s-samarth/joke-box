"""a Trash: deleted things wait 30 days before they're erased

Each kind of thing that can go to the Trash gets a `deleted_at` time. Empty means it isn't
in the Trash. Sets, and organisers like topics and venues, are still deleted at once.

Revision ID: 0014
Revises: 0013
Create Date: 2026-10-22 20:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0014"
down_revision: str | Sequence[str] | None = "0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = (
    "bits",
    "observations",
    "writing_sessions",
    "brainstorms",
    "performance_logs",
    "voice_notes",
    "analyses",
    "watch_items",
    "craft_notes",
)


def upgrade() -> None:
    """Nothing starts in the Trash."""
    for table in TABLES:
        with op.batch_alter_table(table) as batch:
            batch.add_column(sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
            batch.create_index(f"ix_{table}_deleted_at", ["deleted_at"])


def downgrade() -> None:
    for table in TABLES:
        with op.batch_alter_table(table) as batch:
            batch.drop_index(f"ix_{table}_deleted_at")
            batch.drop_column("deleted_at")
