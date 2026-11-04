"""a joke can be unrated

- `jokes.strength` may be NULL: not rated yet. New jokes start that way instead of at 3, so a
  3 always means someone chose it. Every joke already there keeps its rating. The 1-5 check
  still holds for rated jokes (a CHECK passes NULL).

Revision ID: 0028
Revises: 0027
Create Date: 2026-11-04 14:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0028"
down_revision: str | Sequence[str] | None = "0027"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("jokes", schema=None) as batch_op:
        batch_op.alter_column("strength", existing_type=sa.SmallInteger(), nullable=True)


def downgrade() -> None:
    op.execute("UPDATE jokes SET strength = 3 WHERE strength IS NULL")
    with op.batch_alter_table("jokes", schema=None) as batch_op:
        batch_op.alter_column("strength", existing_type=sa.SmallInteger(), nullable=False)
