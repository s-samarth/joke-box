"""sets get the same four statuses as premises and observations

Draft (every set starts there), Work in Progress, Stage Ready and Discarded. The Sets screen
filters by them, and Discarded sets hide from All. Every existing set starts as a Draft, and the
column has a default, so the deployment still serving while this runs keeps saving sets.

Revision ID: 0046
Revises: 0045
Create Date: 2026-11-25 07:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0046"
down_revision: str | Sequence[str] | None = "0045"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

STATUSES = "status IN ('Draft', 'Work in Progress', 'Stage Ready', 'Discarded')"


def upgrade() -> None:
    with op.batch_alter_table("setlists") as batch:
        batch.add_column(sa.Column("status", sa.String(20), nullable=False, server_default="Draft"))
        batch.create_check_constraint(op.f("ck_setlists_status_values"), STATUSES)


def downgrade() -> None:
    with op.batch_alter_table("setlists") as batch:
        batch.drop_constraint(op.f("ck_setlists_status_values"), type_="check")
        batch.drop_column("status")
