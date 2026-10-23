"""every joke has a status: Draft by default, and Need Tags joins the list

Jokes with no status, or with "Status Unknown", become Draft, and "Status Unknown" goes away.
Every user who has statuses gets Draft and Need Tags if they don't have them yet, after the
statuses they already have. Edit times and versions are left alone: nobody edited these jokes.

Downgrade leaves the data as it is; which jokes had no status before can't be told apart.

Revision ID: 0021
Revises: 0020
Create Date: 2026-10-24 06:00:00.000000

"""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0021"
down_revision: str | Sequence[str] | None = "0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ADDED = ["Draft", "Need Tags"]
RETIRED = "status unknown"


def upgrade() -> None:
    conn = op.get_bind()
    statuses = sa.table(
        "statuses",
        sa.column("id", sa.Uuid()),
        sa.column("user_id", sa.Uuid()),
        sa.column("name"),
        sa.column("position"),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    jokes = sa.table("jokes", sa.column("user_id", sa.Uuid()), sa.column("status_id", sa.Uuid()))
    now = datetime.now(UTC)
    owners: dict[object, list[tuple[object, str, int]]] = {}
    for id_, owner, name, position in conn.execute(
        sa.select(statuses.c.id, statuses.c.user_id, statuses.c.name, statuses.c.position)
    ):
        owners.setdefault(owner, []).append((id_, name, position))
    for owner, rows in owners.items():
        by_name = {name.lower(): id_ for id_, name, _ in rows}
        last = max(position for _, _, position in rows)
        for name in ADDED:
            if name.lower() not in by_name:
                last += 1
                by_name[name.lower()] = uuid.uuid4()
                conn.execute(
                    statuses.insert().values(
                        id=by_name[name.lower()],
                        user_id=owner,
                        name=name,
                        position=last,
                        created_at=now,
                        updated_at=now,
                    )
                )
        retired = [id_ for id_, name, _ in rows if name.lower() == RETIRED]
        conn.execute(
            jokes.update()
            .where(
                jokes.c.user_id == owner,
                sa.or_(jokes.c.status_id.is_(None), jokes.c.status_id.in_(retired)),
            )
            .values(status_id=by_name["draft"])
        )
        if retired:
            conn.execute(statuses.delete().where(statuses.c.id.in_(retired)))


def downgrade() -> None:
    pass
