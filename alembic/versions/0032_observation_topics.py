"""observations get a topic from the joke topics; their old topics become kinds

An observation's existing `topic_id` keeps pointing at `observation_topics`, which the app now
calls kinds ("Set ideas", "Questions"). The new `joke_topic_id` files it under a joke topic, the
same list jokes and premises use. Every observation starts with none: Not sorted.

Nothing is renamed, so the deployment still serving during the build keeps working.

Revision ID: 0032
Revises: 0031
Create Date: 2026-11-07 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0032"
down_revision: str | Sequence[str] | None = "0031"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("observations") as batch:
        batch.add_column(sa.Column("joke_topic_id", sa.Uuid(), nullable=True))
        batch.create_foreign_key(
            batch.f("fk_observations_joke_topic_id_topics"),
            "topics",
            ["joke_topic_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch.create_index(batch.f("ix_observations_joke_topic_id"), ["joke_topic_id"])


def downgrade() -> None:
    with op.batch_alter_table("observations") as batch:
        batch.drop_index(batch.f("ix_observations_joke_topic_id"))
        batch.drop_constraint(batch.f("fk_observations_joke_topic_id_topics"), type_="foreignkey")
        batch.drop_column("joke_topic_id")
