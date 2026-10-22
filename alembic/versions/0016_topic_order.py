"""topics, subtopics and observation topics keep the order you arrange them in

Joke topics already had a position (always 0, so they listed by name). Subtopics and observation
topics get one now. Everyone's lists are numbered in their current, alphabetical order, so nothing
moves until you drag it.

Revision ID: 0016
Revises: 0015
Create Date: 2026-10-23 00:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0016"
down_revision: str | Sequence[str] | None = "0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Each table, and the column whose rows form one list (one user's topics, one topic's subtopics).
LISTS = [("topics", "user_id"), ("subtopics", "topic_id"), ("observation_topics", "user_id")]


def upgrade() -> None:
    for table in ("subtopics", "observation_topics"):
        with op.batch_alter_table(table) as batch:
            batch.add_column(
                sa.Column("position", sa.Integer(), nullable=False, server_default="0")
            )
    conn = op.get_bind()
    for table, group in LISTS:
        t = sa.table(
            table, sa.column("id"), sa.column(group), sa.column("name"), sa.column("position")
        )
        rows = conn.execute(sa.select(t.c.id, t.c[group], t.c.name)).all()
        places: dict[object, int] = {}
        for row_id, owner, _ in sorted(rows, key=lambda r: (str(r[1]), r[2].lower())):
            places[owner] = places.get(owner, -1) + 1
            conn.execute(t.update().where(t.c.id == row_id).values(position=places[owner]))


def downgrade() -> None:
    # On SQLite dropping a column rebuilds the table, which loses its lower(name) unique index.
    unique = {"subtopics": "topic_id", "observation_topics": "user_id"}
    for table, group in unique.items():
        with op.batch_alter_table(table) as batch:
            batch.drop_column("position")
        op.create_index(
            f"uq_{table}_{group.removesuffix('_id')}_name",
            table,
            [group, sa.text("lower(name)")],
            unique=True,
            if_not_exists=True,
        )
