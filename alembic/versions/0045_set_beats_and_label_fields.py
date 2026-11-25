"""Sets as beats (docs/sets.md): a point and beats on each set, and your label fields.

Sets saved before this keep `beats` empty (NULL) and read as one beat holding their jokes, so
nothing needs moving here. `point` and `beats` are only added, so an app from before keeps
working: its saves send `items`, and the server keeps a set's beats as they are.
"""

import sqlalchemy as sa

from alembic import op

revision = "0045"
down_revision = "0044"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("setlists") as batch:
        batch.add_column(sa.Column("point", sa.Text(), nullable=False, server_default=""))
        batch.add_column(sa.Column("beats", sa.JSON(), nullable=True))
    op.create_table(
        "set_field_configs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("fields", sa.JSON(), nullable=False),
        sa.Column("top_up_seconds", sa.Integer(), nullable=False, server_default="240"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_set_field_configs_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_set_field_configs")),
        sa.UniqueConstraint("user_id", name=op.f("uq_set_field_configs_user_id")),
    )


def downgrade() -> None:
    op.drop_table("set_field_configs")
    with op.batch_alter_table("setlists") as batch:
        batch.drop_column("beats")
        batch.drop_column("point")
