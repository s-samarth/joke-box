"""every topic gets a protected "Subtopic unknown", and jokes with no subtopic move into it

`subtopics.is_system` marks each topic's default. A topic that already has a subtopic used for
this (called "Subtopic unknown", "Sub topic unknown" or the comic's own "Sub Topic nahi pata")
has it renamed and made the default; every other topic gets a new one. Then every joke filed
under a topic with no subtopic, the Trash included, moves into its topic's default, so "no
subtopic" and "unknown" stop being two different buckets. The new column has a default, so the
deployment still serving while this runs keeps saving.

Revision ID: 0042
Revises: 0041
Create Date: 2026-11-24 20:00:00.000000

"""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0042"
down_revision: str | Sequence[str] | None = "0041"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

UNKNOWN = "Subtopic unknown"
ADOPT = ("subtopic unknown", "sub topic unknown", "sub topic nahi pata", "subtopic nahi pata")

topics = sa.table("topics", sa.column("id", sa.Uuid()), sa.column("user_id", sa.Uuid()))
subtopics = sa.table(
    "subtopics",
    sa.column("id", sa.Uuid()),
    sa.column("user_id", sa.Uuid()),
    sa.column("topic_id", sa.Uuid()),
    sa.column("name", sa.String()),
    sa.column("position", sa.Integer()),
    sa.column("is_system", sa.Boolean()),
    sa.column("created_at", sa.DateTime(timezone=True)),
    sa.column("updated_at", sa.DateTime(timezone=True)),
)
jokes = sa.table("jokes", sa.column("topic_id", sa.Uuid()), sa.column("subtopic_id", sa.Uuid()))


def default_for(bind: sa.Connection, topic_id: uuid.UUID, user_id: uuid.UUID) -> uuid.UUID:
    """The topic's existing stand-in, renamed and made the default, or a new one."""
    found = bind.execute(
        sa.select(subtopics.c.id).where(
            subtopics.c.topic_id == topic_id, sa.func.lower(subtopics.c.name).in_(ADOPT)
        )
    ).first()
    now = datetime.now(UTC)
    if found is not None:
        bind.execute(
            subtopics.update()
            .where(subtopics.c.id == found.id)
            .values(name=UNKNOWN, is_system=True, updated_at=now)
        )
        return found.id
    new_id = uuid.uuid4()
    bind.execute(
        subtopics.insert().values(
            id=new_id,
            user_id=user_id,
            topic_id=topic_id,
            name=UNKNOWN,
            position=0,
            is_system=True,
            created_at=now,
            updated_at=now,
        )
    )
    return new_id


def upgrade() -> None:
    with op.batch_alter_table("subtopics") as batch:
        batch.add_column(
            sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.false())
        )
    bind = op.get_bind()
    for topic in bind.execute(sa.select(topics.c.id, topics.c.user_id)).all():
        default = default_for(bind, topic.id, topic.user_id)
        bind.execute(
            jokes.update()
            .where(jokes.c.topic_id == topic.id, jokes.c.subtopic_id.is_(None))
            .values(subtopic_id=default)
        )


def downgrade() -> None:
    """Jokes in a default go back to no subtopic, and the defaults go (an adopted one too)."""
    system = sa.select(subtopics.c.id).where(subtopics.c.is_system.is_(True))
    op.execute(jokes.update().where(jokes.c.subtopic_id.in_(system)).values(subtopic_id=None))
    op.execute(subtopics.delete().where(subtopics.c.is_system.is_(True)))
    with op.batch_alter_table("subtopics") as batch:
        batch.drop_column("is_system")
