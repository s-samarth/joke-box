"""brainstorm session technique

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-21 19:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0008"
down_revision: str | Sequence[str] | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """A brainstorm session can run a craft technique. Deleting the note just unlinks it."""
    with op.batch_alter_table("writing_sessions", schema=None) as batch_op:
        batch_op.add_column(sa.Column("technique_id", sa.Uuid(), nullable=True))
        batch_op.create_foreign_key(
            batch_op.f("fk_writing_sessions_technique_id_craft_notes"),
            "craft_notes",
            ["technique_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    """Sessions forget their technique."""
    with op.batch_alter_table("writing_sessions", schema=None) as batch_op:
        batch_op.drop_constraint(
            batch_op.f("fk_writing_sessions_technique_id_craft_notes"), type_="foreignkey"
        )
        batch_op.drop_column("technique_id")
