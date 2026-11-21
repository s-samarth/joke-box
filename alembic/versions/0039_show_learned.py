"""what you learned at a show is a comment on the show, not a Craft note

`learned` on a show starts empty. Lessons saved before as Craft notes linked to a show (the old
"What did you learn?" and set-review's `log_show`) move onto their show: the note's text (its
body, which repeats the title, or the title alone), several joined by a blank line, oldest first.
The notes go to the Trash, where they can be put back for 30 days. Craft keeps general lessons
only. Downgrading drops the column; the notes stay in the Trash.

Revision ID: 0039
Revises: 0038
Create Date: 2026-11-22 12:00:00.000000

"""

from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0039"
down_revision: str | Sequence[str] | None = "0038"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

logs = sa.table("performance_logs", sa.column("id", sa.Uuid), sa.column("learned", sa.Text))
notes = sa.table(
    "craft_notes",
    sa.column("id", sa.Uuid),
    sa.column("title", sa.String),
    sa.column("body", sa.Text),
    sa.column("performance_log_id", sa.Uuid),
    sa.column("created_at", sa.DateTime(timezone=True)),
    sa.column("deleted_at", sa.DateTime(timezone=True)),
)


def move_lessons() -> None:
    """Each show's linked, untrashed Craft notes become its `learned`; the notes go to the Trash."""
    conn = op.get_bind()
    rows = conn.execute(
        sa.select(notes.c.id, notes.c.title, notes.c.body, notes.c.performance_log_id)
        .where(notes.c.performance_log_id.is_not(None), notes.c.deleted_at.is_(None))
        .order_by(notes.c.created_at)
    ).all()
    by_show: dict[object, list[str]] = {}
    for _id, title, body, log_id in rows:
        text = (body or "").strip() or (title or "").strip()
        if text:
            by_show.setdefault(log_id, []).append(text)
    for log_id, texts in by_show.items():
        conn.execute(logs.update().where(logs.c.id == log_id).values(learned="\n\n".join(texts)))
    if rows:
        conn.execute(
            notes.update()
            .where(notes.c.id.in_([r[0] for r in rows]))
            .values(deleted_at=datetime.now(UTC))
        )


def upgrade() -> None:
    with op.batch_alter_table("performance_logs") as batch:
        batch.add_column(sa.Column("learned", sa.Text(), nullable=False, server_default=""))
    move_lessons()


def downgrade() -> None:
    with op.batch_alter_table("performance_logs") as batch:
        batch.drop_column("learned")
