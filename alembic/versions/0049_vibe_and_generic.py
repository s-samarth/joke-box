"""a vibe on each premise, and Generic or Non-generic on jokes and premises

`premises.persona` holds an option id from the comic's persona field, as `jokes.persona` does
(0048): which side of the comic the premise shows, its Vibe in the app. NULL is Not sure.
`generic` on both says whether the material is generic (anyone could do it) or not; NULL is not
answered yet, which the app flags. Added plainly, not in batch mode, so SQLite keeps the indexes.

Revision ID: 0049
Revises: 0048
Create Date: 2026-11-25 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0049"
down_revision: str | Sequence[str] | None = "0048"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("premises", sa.Column("persona", sa.String(64), nullable=True))
    op.add_column("premises", sa.Column("generic", sa.Boolean(), nullable=True))
    op.add_column("jokes", sa.Column("generic", sa.Boolean(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("jokes") as batch:
        batch.drop_column("generic")
    with op.batch_alter_table("premises") as batch:
        batch.drop_column("generic")
        batch.drop_column("persona")
