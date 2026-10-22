"""sets get a rating, tags of your own, and optional jokes

A set can be rated 1-5 stars. Tags (In progress, Weak, Opener set...) are yours to add, rename and
delete; everyone gets the starting ones once, here. A joke in a set can be optional: one to cut
if time is short, not counted towards the slot.

Revision ID: 0015
Revises: 0014
Create Date: 2026-10-22 23:00:00.000000

"""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0015"
down_revision: str | Sequence[str] | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# The same starting tags as app/services/set_tags.py, copied so this migration never changes.
TAGS = [
    "In progress",
    "Weak",
    "Incomplete",
    "Complete",
    "Opener set",
    "Closer set",
    "Story",
    "One-liners",
]

tags = sa.table(
    "set_tags",
    sa.column("id", sa.Uuid()),
    sa.column("user_id", sa.Uuid()),
    sa.column("name", sa.String()),
    sa.column("position", sa.Integer()),
    sa.column("created_at", sa.DateTime(timezone=True)),
    sa.column("updated_at", sa.DateTime(timezone=True)),
)
users = sa.table("users", sa.column("id", sa.Uuid()))


def upgrade() -> None:
    op.create_table(
        "set_tags",
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_set_tags_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_set_tags")),
    )
    op.create_index(op.f("ix_set_tags_user_id"), "set_tags", ["user_id"], unique=False)
    op.create_index(
        "uq_set_tags_user_name", "set_tags", ["user_id", sa.text("lower(name)")], unique=True
    )
    op.create_table(
        "setlist_tag_links",
        sa.Column("setlist_id", sa.Uuid(), nullable=False),
        sa.Column("tag_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["setlist_id"],
            ["setlists.id"],
            name=op.f("fk_setlist_tag_links_setlist_id_setlists"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["tag_id"],
            ["set_tags.id"],
            name=op.f("fk_setlist_tag_links_tag_id_set_tags"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("setlist_id", "tag_id", name=op.f("pk_setlist_tag_links")),
    )
    with op.batch_alter_table("setlists") as batch:
        batch.add_column(sa.Column("rating", sa.Integer(), nullable=True))
        batch.create_check_constraint(op.f("ck_setlists_rating_range"), "rating BETWEEN 1 AND 5")
    with op.batch_alter_table("setlist_items") as batch:
        batch.add_column(
            sa.Column("optional", sa.Boolean(), nullable=False, server_default=sa.false())
        )
    give_everyone_tags()


def give_everyone_tags() -> None:
    conn = op.get_bind()
    now = datetime.now(UTC)
    for (user_id,) in conn.execute(sa.select(users.c.id)).all():
        rows = [
            {
                "id": uuid.uuid4(),
                "user_id": user_id,
                "name": name,
                "position": position,
                "created_at": now,
                "updated_at": now,
            }
            for position, name in enumerate(TAGS)
        ]
        conn.execute(tags.insert(), rows)


def downgrade() -> None:
    with op.batch_alter_table("setlist_items") as batch:
        batch.drop_column("optional")
    with op.batch_alter_table("setlists") as batch:
        batch.drop_constraint(op.f("ck_setlists_rating_range"), type_="check")
        batch.drop_column("rating")
    op.drop_table("setlist_tag_links")
    op.drop_index("uq_set_tags_user_name", table_name="set_tags")
    op.drop_index(op.f("ix_set_tags_user_id"), table_name="set_tags")
    op.drop_table("set_tags")
