"""sets and premises go to the Trash; brainstorms keep a stroke count beside their ink

- `setlists.deleted_at` and `premises.deleted_at`: deleting a set or a premise now moves it
  to the Trash for 30 days, like jokes, instead of erasing it at once.
- `premises.trashed_joke_ids`: the jokes that rested on a premise when it went to the Trash.
  They're set loose meanwhile (as a deleted premise always left them), and putting the premise
  back puts them back on it.
- `writing_sessions.ink_strokes`: how many strokes a session's handwriting has, so the list of
  sessions never has to load the handwriting itself. Counted from the ink already there.

Revision ID: 0025
Revises: 0024
Create Date: 2026-11-03 23:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0025"
down_revision: str | Sequence[str] | None = "0024"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TRASHED = ("setlists", "premises")


def upgrade() -> None:
    for table in TRASHED:
        with op.batch_alter_table(table) as batch:
            batch.add_column(sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
            batch.create_index(f"ix_{table}_deleted_at", ["deleted_at"])
    with op.batch_alter_table("premises") as batch:
        batch.add_column(sa.Column("trashed_joke_ids", sa.JSON(), nullable=True))
    with op.batch_alter_table("writing_sessions") as batch:
        batch.add_column(sa.Column("ink_strokes", sa.Integer(), nullable=False, server_default="0"))
    # Both Postgres (json) and SQLite count a JSON array with json_array_length.
    op.execute("UPDATE writing_sessions SET ink_strokes = json_array_length(ink)")


def downgrade() -> None:
    with op.batch_alter_table("writing_sessions") as batch:
        batch.drop_column("ink_strokes")
    with op.batch_alter_table("premises") as batch:
        batch.drop_column("trashed_joke_ids")
    for table in TRASHED:
        with op.batch_alter_table(table) as batch:
            batch.drop_index(f"ix_{table}_deleted_at")
            batch.drop_column("deleted_at")
