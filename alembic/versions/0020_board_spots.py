"""jokes you place by hand on the joke board

A spot is where you dropped a joke, relative to its topic island, kept in its own table so moving
a box never changes the joke's version or edit time. Erasing the joke erases its spot.

Revision ID: 0020
Revises: 0019
Create Date: 2026-10-24 03:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0020"
down_revision: str | Sequence[str] | None = "0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "board_spots",
        sa.Column("joke_id", sa.Uuid(), nullable=False),
        sa.Column("topic_id", sa.Uuid(), nullable=False),
        sa.Column("x", sa.Float(), nullable=False),
        sa.Column("y", sa.Float(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["joke_id"], ["jokes.id"], name=op.f("fk_board_spots_joke_id_jokes"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_board_spots_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_board_spots")),
        sa.UniqueConstraint("joke_id", name=op.f("uq_board_spots_joke_id")),
    )
    with op.batch_alter_table("board_spots", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_board_spots_user_id"), ["user_id"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("board_spots", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_board_spots_user_id"))
    op.drop_table("board_spots")
