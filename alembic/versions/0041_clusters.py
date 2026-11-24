"""clusters: versions of one joke kept together, with a lead

A new `clusters` table (the core idea's title, notes, the lead version and a version number for
edits made on two devices) and `jokes.cluster_id`. Every existing joke starts in no cluster. The
new column is nullable, so the deployment still serving while this runs keeps saving.

Revision ID: 0041
Revises: 0040
Create Date: 2026-11-24 18:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0041"
down_revision: str | Sequence[str] | None = "0040"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "clusters",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False, server_default=""),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("lead_joke_id", sa.Uuid(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_clusters_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_clusters")),
    )
    op.create_index(op.f("ix_clusters_user_id"), "clusters", ["user_id"])
    with op.batch_alter_table("jokes") as batch:
        batch.add_column(sa.Column("cluster_id", sa.Uuid(), nullable=True))
        batch.create_foreign_key(
            op.f("fk_jokes_cluster_id_clusters"),
            "clusters",
            ["cluster_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch.create_index(op.f("ix_jokes_cluster_id"), ["cluster_id"])


def downgrade() -> None:
    with op.batch_alter_table("jokes") as batch:
        batch.drop_index(op.f("ix_jokes_cluster_id"))
        batch.drop_constraint(op.f("fk_jokes_cluster_id_clusters"), type_="foreignkey")
        batch.drop_column("cluster_id")
    op.drop_index(op.f("ix_clusters_user_id"), table_name="clusters")
    op.drop_table("clusters")
