"""imported jokes were last changed when they were written

Every joke brought in from WhatsApp and OneNote was tidied in bulk on 21 Oct 2026 (IST), which
stamped that day as its last change. Under "Recently edited" they all showed as edited that day.
This puts each one's last change back to when it was written. Jokes written that day are left.

Revision ID: 0012
Revises: 0011
Create Date: 2026-10-22 12:00:00.000000

"""

from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0012"
down_revision: str | Sequence[str] | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# 21 Oct 2026 in IST, as UTC.
DAY_START = datetime(2026, 10, 20, 18, 30, tzinfo=UTC)
DAY_END = datetime(2026, 10, 21, 18, 30, tzinfo=UTC)

bits = sa.table(
    "bits",
    sa.column("created_at", sa.DateTime(timezone=True)),
    sa.column("updated_at", sa.DateTime(timezone=True)),
)


def upgrade() -> None:
    """Reset the last change of jokes written before the bulk tidy-up and untouched since."""
    op.execute(
        bits.update()
        .where(bits.c.updated_at >= DAY_START)
        .where(bits.c.updated_at < DAY_END)
        .where(bits.c.created_at < DAY_START)
        .values(updated_at=bits.c.created_at)
    )


def downgrade() -> None:
    """Nothing to undo: the bulk tidy-up's timestamps weren't worth keeping."""
