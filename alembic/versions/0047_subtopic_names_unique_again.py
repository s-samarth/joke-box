"""subtopic names are unique per topic again on SQLite

0042 rebuilt `subtopics` in batch mode on SQLite, and the rebuild left out the expression index
`uq_subtopics_topic_name` (topic_id, lower(name)). Postgres altered the table in place and kept
it. This puts it back where it's missing, and changes nothing where it's there.

Revision ID: 0047
Revises: 0046
Create Date: 2026-11-25 09:00:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0047"
down_revision: str | Sequence[str] | None = "0046"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_subtopics_topic_name "
        "ON subtopics (topic_id, lower(name))"
    )


def downgrade() -> None:
    # The index belongs to 0001: going back past this revision leaves it in place.
    pass
