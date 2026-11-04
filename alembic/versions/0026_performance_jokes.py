"""shows record which jokes were done, and how each went

- `performance_jokes`: one row per joke done at a logged show, in running order, with how it
  went (`bombed`, `ok`, `killed`, or none if not rated). Owned through the show; erasing the
  show or the joke for good erases the row.

Revision ID: 0026
Revises: 0025
Create Date: 2026-11-04 04:10:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0026"
down_revision: str | Sequence[str] | None = "0025"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "performance_jokes",
        sa.Column("log_id", sa.Uuid(), nullable=False),
        sa.Column("joke_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("result", sa.String(length=10), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.CheckConstraint(
            "result IN ('bombed', 'ok', 'killed')", name=op.f("ck_performance_jokes_result_kind")
        ),
        sa.ForeignKeyConstraint(
            ["joke_id"],
            ["jokes.id"],
            name=op.f("fk_performance_jokes_joke_id_jokes"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["log_id"],
            ["performance_logs.id"],
            name=op.f("fk_performance_jokes_log_id_performance_logs"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_performance_jokes")),
        sa.UniqueConstraint("log_id", "joke_id", name=op.f("uq_performance_jokes_log_id")),
    )
    with op.batch_alter_table("performance_jokes", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_performance_jokes_joke_id"), ["joke_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_performance_jokes_log_id"), ["log_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("performance_jokes", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_performance_jokes_log_id"))
        batch_op.drop_index(batch_op.f("ix_performance_jokes_joke_id"))
    op.drop_table("performance_jokes")
