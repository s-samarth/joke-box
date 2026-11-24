"""a premise's Testing status becomes Work in Progress; observations get the same statuses

The comic calls a half-built idea "Work in Progress", the same name the jokes use, so every
premise marked Testing moves to it. Observations get a status of their own with the same four
(Draft, Work in Progress, Stage Ready, Discarded); every existing one starts as a Draft, and the
column has a default, so the deployment still serving while this runs keeps saving them.

Expand, then contract: the premises' check constraint still lets "Testing" in, so the deployment
serving during the rollout (and an older app's queued save) keeps working; the app turns a
"Testing" it's sent into Work in Progress.

Revision ID: 0043
Revises: 0042
Create Date: 2026-11-25 10:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0043"
down_revision: str | Sequence[str] | None = "0042"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

OLD = "status IN ('Draft', 'Testing', 'Stage Ready', 'Discarded')"
NEW = "status IN ('Draft', 'Work in Progress', 'Stage Ready', 'Discarded', 'Testing')"
OBSERVATIONS = "status IN ('Draft', 'Work in Progress', 'Stage Ready', 'Discarded')"
premises = sa.table("premises", sa.column("status", sa.String))


def upgrade() -> None:
    with op.batch_alter_table("premises") as batch:
        batch.drop_constraint(op.f("ck_premises_status_values"), type_="check")
        batch.create_check_constraint(op.f("ck_premises_status_values"), NEW)
    op.execute(
        premises.update().where(premises.c.status == "Testing").values(status="Work in Progress")
    )
    with op.batch_alter_table("observations") as batch:
        batch.add_column(sa.Column("status", sa.String(20), nullable=False, server_default="Draft"))
        batch.create_check_constraint(op.f("ck_observations_status_values"), OBSERVATIONS)


def downgrade() -> None:
    with op.batch_alter_table("observations") as batch:
        batch.drop_constraint(op.f("ck_observations_status_values"), type_="check")
        batch.drop_column("status")
    op.execute(
        premises.update().where(premises.c.status == "Work in Progress").values(status="Testing")
    )
    with op.batch_alter_table("premises") as batch:
        batch.drop_constraint(op.f("ck_premises_status_values"), type_="check")
        batch.create_check_constraint(op.f("ck_premises_status_values"), OLD)
