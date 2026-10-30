"""premises: the idea under a group of jokes

A premise is filed under a topic and holds your take and the reasoning behind it. A joke can rest
on one premise, from any topic; deleting the premise keeps its jokes.

Revision ID: 0023
Revises: 0022
Create Date: 2026-10-30 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0023"
down_revision: str | Sequence[str] | None = "0022"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "premises",
        sa.Column("topic_id", sa.Uuid(), nullable=False),
        sa.Column("take", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["topic_id"],
            ["topics.id"],
            name=op.f("fk_premises_topic_id_topics"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_premises_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_premises")),
    )
    with op.batch_alter_table("premises", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_premises_topic_id"), ["topic_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_premises_user_id"), ["user_id"], unique=False)

    with op.batch_alter_table("jokes", schema=None) as batch_op:
        batch_op.add_column(sa.Column("premise_id", sa.Uuid(), nullable=True))
        batch_op.create_index(batch_op.f("ix_jokes_premise_id"), ["premise_id"], unique=False)
        batch_op.create_foreign_key(
            batch_op.f("fk_jokes_premise_id_premises"),
            "premises",
            ["premise_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    with op.batch_alter_table("jokes", schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f("fk_jokes_premise_id_premises"), type_="foreignkey")
        batch_op.drop_index(batch_op.f("ix_jokes_premise_id"))
        batch_op.drop_column("premise_id")
    with op.batch_alter_table("premises", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_premises_user_id"))
        batch_op.drop_index(batch_op.f("ix_premises_topic_id"))
    op.drop_table("premises")
