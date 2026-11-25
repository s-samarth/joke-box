"""a persona on each joke, and "Persona side" becomes "Dominant persona side"

`jokes.persona` holds an option id from the comic's persona field (the same list a beat's
Dominant persona side picks from), or NULL for Not sure. It's added plainly, not in batch mode,
so SQLite keeps the jokes table's indexes (see 0047). A saved persona field still called
"Persona side" is renamed; one the comic named differently is left alone.

Revision ID: 0048
Revises: 0047
Create Date: 2026-11-25 10:00:00.000000

"""

from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0048"
down_revision: str | Sequence[str] | None = "0047"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

configs = sa.table("set_field_configs", sa.column("id", sa.Uuid()), sa.column("fields", sa.JSON()))


def rename(old: str, new: str) -> None:
    conn = op.get_bind()
    for row in conn.execute(sa.select(configs.c.id, configs.c.fields)).all():
        fields: list[dict[str, Any]] = row.fields or []
        if not any(f.get("role") == "persona" and f.get("name") == old for f in fields):
            continue
        renamed = [
            {**f, "name": new} if f.get("role") == "persona" and f.get("name") == old else f
            for f in fields
        ]
        conn.execute(sa.update(configs).where(configs.c.id == row.id).values(fields=renamed))


def upgrade() -> None:
    op.add_column("jokes", sa.Column("persona", sa.String(64), nullable=True))
    rename("Persona side", "Dominant persona side")


def downgrade() -> None:
    rename("Dominant persona side", "Persona side")
    with op.batch_alter_table("jokes") as batch:
        batch.drop_column("persona")
