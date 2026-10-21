"""craft notes

Revision ID: 0007
Revises: 0006
Create Date: 2026-10-21 18:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0007"
down_revision: str | Sequence[str] | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

KINDS = "kind IN ('checklist', 'technique', 'reference', 'path')"
AREAS = "area IN ('writing', 'generating', 'rewriting', 'sets', 'stage', 'formats', 'progress')"


def upgrade() -> None:
    """Craft notes: checklists, techniques, reference and goals, each filed under an area."""
    op.create_table(
        "craft_notes",
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("kind", sa.String(length=20), nullable=False),
        sa.Column("area", sa.String(length=20), nullable=False),
        sa.Column("hashtags", sa.JSON(), nullable=False),
        sa.Column("source", sa.String(length=200), nullable=False),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(AREAS, name=op.f("ck_craft_notes_area_values")),
        sa.CheckConstraint(KINDS, name=op.f("ck_craft_notes_kind_values")),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_craft_notes_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_craft_notes")),
    )
    op.create_index(op.f("ix_craft_notes_user_id"), "craft_notes", ["user_id"], unique=False)


def downgrade() -> None:
    """Drop craft notes."""
    op.drop_index(op.f("ix_craft_notes_user_id"), table_name="craft_notes")
    op.drop_table("craft_notes")
