"""lessons from shows and analyses, laugh tally

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-21 20:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0009"
down_revision: str | Sequence[str] | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SOURCES = (("performance_log_id", "performance_logs"), ("analysis_id", "analyses"))


def upgrade() -> None:
    """Craft notes can point at the show or analysis they came from; shows get a laugh tally."""
    with op.batch_alter_table("craft_notes", schema=None) as batch_op:
        for column, table in SOURCES:
            batch_op.add_column(sa.Column(column, sa.Uuid(), nullable=True))
            batch_op.create_index(batch_op.f(f"ix_craft_notes_{column}"), [column], unique=False)
            batch_op.create_foreign_key(
                batch_op.f(f"fk_craft_notes_{column}_{table}"),
                table,
                [column],
                ["id"],
                ondelete="SET NULL",
            )
    with op.batch_alter_table("performance_logs", schema=None) as batch_op:
        batch_op.add_column(sa.Column("laughs", sa.JSON(), nullable=True))


def downgrade() -> None:
    """Drop the laugh tally and the lesson sources."""
    with op.batch_alter_table("performance_logs", schema=None) as batch_op:
        batch_op.drop_column("laughs")
    with op.batch_alter_table("craft_notes", schema=None) as batch_op:
        for column, table in SOURCES:
            batch_op.drop_constraint(
                batch_op.f(f"fk_craft_notes_{column}_{table}"), type_="foreignkey"
            )
            batch_op.drop_index(batch_op.f(f"ix_craft_notes_{column}"))
            batch_op.drop_column(column)
