"""types get a colour you can choose

Colours live in their own table, by name, so a type that is pruned and used again keeps its
colour. Every existing type gets one now: the seven common forms keep the colours the app has
always shown, and the rest get distinct ones in alphabetical order.

Revision ID: 0017
Revises: 0016
Create Date: 2026-10-23 18:00:00.000000

"""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0017"
down_revision: str | Sequence[str] | None = "0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# A snapshot of app/services/type_colors.py, so this step never changes if those lists do.
DEFAULT_COLORS = {
    "one-liner": "#7dd3fc",
    "story": "#c4b5fd",
    "crowd work": "#fcd34d",
    "roast": "#fb7185",
    "observation": "#6ee7b7",
    "premise": "#f9a8d4",
    "act out": "#fdba74",
}
AUTO_COLORS = [
    "#fde047", "#5eead4", "#fca5a5", "#93c5fd", "#bef264", "#f0abfc", "#67e8f9",
    "#d8b4fe", "#86efac", "#a5b4fc", "#f97316", "#0ea5e9", "#8b5cf6", "#10b981",
    "#f43f5e", "#f59e0b", "#ec4899", "#3b82f6", "#84cc16", "#14b8a6", "#ef4444",
    "#eab308", "#a855f7", "#06b6d4", "#22c55e", "#6366f1", "#d946ef",
]  # fmt: skip


def upgrade() -> None:
    op.create_table(
        "type_colors",
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("color", sa.String(length=7), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_type_colors_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_type_colors")),
    )
    with op.batch_alter_table("type_colors", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_type_colors_user_id"), ["user_id"], unique=False)
    op.create_index(
        "uq_type_colors_user_name", "type_colors", ["user_id", sa.text("lower(name)")], unique=True
    )

    conn = op.get_bind()
    types = sa.table("bit_types", sa.column("user_id", sa.Uuid()), sa.column("name"))
    colors = sa.table(
        "type_colors",
        sa.column("id", sa.Uuid()),
        sa.column("user_id", sa.Uuid()),
        sa.column("name"),
        sa.column("color"),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    now = datetime.now(UTC)
    used: dict[object, set[str]] = {}
    rows = conn.execute(sa.select(types.c.user_id, types.c.name)).all()
    # Defaults first, so the others never take a colour a default already has.
    for owner, name in sorted(
        rows, key=lambda r: (r[1].lower() not in DEFAULT_COLORS, r[1].lower())
    ):
        taken = used.setdefault(owner, set())
        free = [c for c in AUTO_COLORS if c not in taken]
        cycled = AUTO_COLORS[len(taken) % len(AUTO_COLORS)]
        color = DEFAULT_COLORS.get(name.lower()) or (free[0] if free else cycled)
        taken.add(color)
        conn.execute(
            colors.insert().values(
                id=uuid.uuid4(),
                user_id=owner,
                name=name,
                color=color,
                created_at=now,
                updated_at=now,
            )
        )


def downgrade() -> None:
    op.drop_index("uq_type_colors_user_name", table_name="type_colors")
    op.drop_table("type_colors")
