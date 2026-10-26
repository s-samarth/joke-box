"""watchlist scores fit the persona: Contrast, Logic Density and Has a Point

schemer_index becomes contrast and keeps its numbers: both measure finding the rule that breaks.
dark_pragmatism becomes has_a_point and is cleared, because a darkness score says nothing about
whether a routine makes a point. Downgrade renames the columns back; the cleared scores stay empty.

Revision ID: 0022
Revises: 0021
Create Date: 2026-10-26 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0022"
down_revision: str | Sequence[str] | None = "0021"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# (old column, new column)
COLUMNS = [("schemer_index", "contrast"), ("dark_pragmatism", "has_a_point")]


def rename(pairs: list[tuple[str, str]]) -> None:
    for old, new in pairs:
        op.execute(f'ALTER TABLE watch_items RENAME COLUMN "{old}" TO "{new}"')


def upgrade() -> None:
    rename(COLUMNS)
    op.execute(sa.text("UPDATE watch_items SET has_a_point = NULL"))


def downgrade() -> None:
    rename([(new, old) for old, new in COLUMNS])
