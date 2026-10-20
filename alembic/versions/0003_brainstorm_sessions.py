"""brainstorm sessions

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-20 21:57:12.783087

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003"
down_revision: str | Sequence[str] | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add free brainstorm sessions."""
    op.create_table(
        "writing_sessions",
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("ink", sa.JSON(), nullable=False),
        sa.Column("timer_seconds", sa.Integer(), nullable=False),
        sa.Column("bit_ids", sa.JSON(), nullable=False),
        sa.Column("observation_ids", sa.JSON(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_writing_sessions_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_writing_sessions")),
    )
    with op.batch_alter_table("writing_sessions", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_writing_sessions_user_id"), ["user_id"], unique=False)


def downgrade() -> None:
    """Remove free brainstorm sessions."""
    with op.batch_alter_table("writing_sessions", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_writing_sessions_user_id"))

    op.drop_table("writing_sessions")
