"""voice notes

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-21 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005"
down_revision: str | Sequence[str] | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Voice notes: the details of each recording. The audio itself lives in Blob storage."""
    op.create_table(
        "voice_notes",
        sa.Column("label", sa.String(length=200), nullable=False),
        sa.Column("hashtags", sa.JSON(), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("audio_path", sa.String(length=300), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_voice_notes_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_voice_notes")),
    )
    op.create_index(op.f("ix_voice_notes_user_id"), "voice_notes", ["user_id"], unique=False)


def downgrade() -> None:
    """Drop voice notes. Audio files already in Blob storage are left there."""
    op.drop_index(op.f("ix_voice_notes_user_id"), table_name="voice_notes")
    op.drop_table("voice_notes")
