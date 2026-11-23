"""premises get a strength and a status; observations a strength

Strength is 1 (Weak) to 5 (Killer), or null (not rated yet), as on jokes; every existing premise
and observation starts unrated. A premise's status is one of Draft, Testing, Stage Ready and
Discarded, its own scale apart from the jokes' statuses; every existing premise starts as a Draft.
The new columns are nullable or have a default, so the deployment still serving while this runs
keeps saving.

Revision ID: 0040
Revises: 0039
Create Date: 2026-11-24 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0040"
down_revision: str | Sequence[str] | None = "0039"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

STATUSES = "status IN ('Draft', 'Testing', 'Stage Ready', 'Discarded')"


def upgrade() -> None:
    with op.batch_alter_table("premises") as batch:
        batch.add_column(sa.Column("strength", sa.SmallInteger(), nullable=True))
        batch.add_column(sa.Column("status", sa.String(20), nullable=False, server_default="Draft"))
        batch.create_check_constraint(
            op.f("ck_premises_strength_range"), "strength BETWEEN 1 AND 5"
        )
        batch.create_check_constraint(op.f("ck_premises_status_values"), STATUSES)
    with op.batch_alter_table("observations") as batch:
        batch.add_column(sa.Column("strength", sa.SmallInteger(), nullable=True))
        batch.create_check_constraint(
            op.f("ck_observations_strength_range"), "strength BETWEEN 1 AND 5"
        )


def downgrade() -> None:
    with op.batch_alter_table("observations") as batch:
        batch.drop_constraint(op.f("ck_observations_strength_range"), type_="check")
        batch.drop_column("strength")
    with op.batch_alter_table("premises") as batch:
        batch.drop_constraint(op.f("ck_premises_status_values"), type_="check")
        batch.drop_constraint(op.f("ck_premises_strength_range"), type_="check")
        batch.drop_column("status")
        batch.drop_column("strength")
