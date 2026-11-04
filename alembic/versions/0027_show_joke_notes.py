"""a joke done at a show can carry a comment

- `performance_jokes.note`: what you noticed about that joke on the night, next to how it went.
  Empty for every row there already.

Revision ID: 0027
Revises: 0026
Create Date: 2026-11-04 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0027"
down_revision: str | Sequence[str] | None = "0026"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("performance_jokes", schema=None) as batch_op:
        batch_op.add_column(sa.Column("note", sa.Text(), nullable=False, server_default=""))


def downgrade() -> None:
    with op.batch_alter_table("performance_jokes", schema=None) as batch_op:
        batch_op.drop_column("note")
