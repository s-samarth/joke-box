"""observations

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-20 21:34:38.810559

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: str | Sequence[str] | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add observations and their own topics."""
    op.create_table(
        "observation_topics",
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_observation_topics_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_observation_topics")),
    )
    with op.batch_alter_table("observation_topics", schema=None) as batch_op:
        batch_op.create_index(
            batch_op.f("ix_observation_topics_user_id"), ["user_id"], unique=False
        )
    op.create_index(
        "uq_observation_topics_user_name",
        "observation_topics",
        ["user_id", sa.text("lower(name)")],
        unique=True,
    )

    op.create_table(
        "observations",
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("topic_id", sa.Uuid(), nullable=True),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["topic_id"],
            ["observation_topics.id"],
            name=op.f("fk_observations_topic_id_observation_topics"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_observations_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_observations")),
    )
    with op.batch_alter_table("observations", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_observations_topic_id"), ["topic_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_observations_user_id"), ["user_id"], unique=False)


def downgrade() -> None:
    """Drop observations and their topics."""
    with op.batch_alter_table("observations", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_observations_user_id"))
        batch_op.drop_index(batch_op.f("ix_observations_topic_id"))
    op.drop_table("observations")

    op.drop_index("uq_observation_topics_user_name", table_name="observation_topics")
    with op.batch_alter_table("observation_topics", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_observation_topics_user_id"))
    op.drop_table("observation_topics")
