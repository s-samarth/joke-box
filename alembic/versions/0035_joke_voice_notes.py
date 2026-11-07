"""jokes remember the voice notes they came from

One id list on each joke. It's kept on the joke, not the recording, because a recording made
offline waits in the phone's own upload queue and can reach the server after the joke does; the
joke's save carries the link whatever order they arrive in. Every joke starts with none.

Revision ID: 0035
Revises: 0034
Create Date: 2026-11-07 20:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0035"
down_revision: str | Sequence[str] | None = "0034"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("jokes") as batch:
        batch.add_column(
            sa.Column("voice_note_ids", sa.JSON(), nullable=False, server_default="[]")
        )


def downgrade() -> None:
    with op.batch_alter_table("jokes") as batch:
        batch.drop_column("voice_note_ids")
