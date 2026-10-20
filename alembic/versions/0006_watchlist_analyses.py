"""watchlist and analyses

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-21 14:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0006"
down_revision: str | Sequence[str] | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def owned_columns() -> list[sa.Column[object]]:
    """The id, owner and timestamp columns every user-owned table has."""
    return [
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    """A watchlist of routines to study, and written analyses of sets and bits."""
    op.create_table(
        "watch_items",
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("comedian", sa.String(length=120), nullable=False),
        sa.Column("category", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("schemer_index", sa.Integer(), nullable=True),
        sa.Column("logic_density", sa.Integer(), nullable=True),
        sa.Column("dark_pragmatism", sa.Integer(), nullable=True),
        sa.Column("watched", sa.Boolean(), nullable=False),
        *owned_columns(),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_watch_items_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_watch_items")),
    )
    op.create_index(op.f("ix_watch_items_user_id"), "watch_items", ["user_id"], unique=False)
    op.create_table(
        "analyses",
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("watch_item_id", sa.Uuid(), nullable=True),
        *owned_columns(),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_analyses_user_id_users"), ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["watch_item_id"],
            ["watch_items.id"],
            name=op.f("fk_analyses_watch_item_id_watch_items"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_analyses")),
    )
    op.create_index(op.f("ix_analyses_user_id"), "analyses", ["user_id"], unique=False)
    op.create_index(op.f("ix_analyses_watch_item_id"), "analyses", ["watch_item_id"], unique=False)


def downgrade() -> None:
    """Drop analyses, then the watchlist."""
    op.drop_index(op.f("ix_analyses_watch_item_id"), table_name="analyses")
    op.drop_index(op.f("ix_analyses_user_id"), table_name="analyses")
    op.drop_table("analyses")
    op.drop_index(op.f("ix_watch_items_user_id"), table_name="watch_items")
    op.drop_table("watch_items")
