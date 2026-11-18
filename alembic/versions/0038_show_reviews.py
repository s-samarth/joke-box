"""shows get a title, and what the set-review engine heard in the recording

`title` on a show starts empty. `suggested_result` on each joke at a show is the engine's guess,
kept beside the comic's own result. `show_reviews` holds a show's laugh timeline (never the
recording itself).

Revision ID: 0038
Revises: 0037
Create Date: 2026-11-18 15:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0038"
down_revision: str | Sequence[str] | None = "0037"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

RESULTS = "IN ('bombed', 'ok', 'killed')"


def upgrade() -> None:
    with op.batch_alter_table("performance_logs") as batch:
        batch.add_column(sa.Column("title", sa.String(200), nullable=False, server_default=""))
    with op.batch_alter_table("performance_jokes") as batch:
        batch.add_column(sa.Column("suggested_result", sa.String(10), nullable=True))
        batch.create_check_constraint("suggested_result_kind", f"suggested_result {RESULTS}")
    op.create_table(
        "show_reviews",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("log_id", sa.Uuid(), nullable=False),
        sa.Column("engine_version", sa.String(40), nullable=False),
        sa.Column("events", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["log_id"],
            ["performance_logs.id"],
            name=op.f("fk_show_reviews_log_id_performance_logs"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_show_reviews")),
        sa.UniqueConstraint("log_id", name=op.f("uq_show_reviews_log_id")),
    )


def downgrade() -> None:
    op.drop_table("show_reviews")
    with op.batch_alter_table("performance_jokes") as batch:
        batch.drop_constraint("suggested_result_kind", type_="check")
        batch.drop_column("suggested_result")
    with op.batch_alter_table("performance_logs") as batch:
        batch.drop_column("title")
