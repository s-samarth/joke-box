"""craft areas you can edit

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-21 21:00:00.000000

"""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0010"
down_revision: str | Sequence[str] | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# The fixed areas so far, as each user's starting areas: (key, name, description, colour, screens).
AREAS = [
    ("writing", "Writing", "Structure, setups, premises, tags, wordplay", "sky", ["rewrite"]),
    ("generating", "Generating", "Techniques for finding new material", "violet", []),
    ("rewriting", "Rewriting", "Checking and tightening a joke", "emerald", ["rewrite"]),
    ("sets", "Building a set", "Openers, running order, longer sets", "orange", ["sets"]),
    ("stage", "On stage", "Delivery, crowd work, hecklers", "rose", ["stage"]),
    ("formats", "Formats", "Topical, political and other kinds of comedy", "pink", []),
    ("progress", "Measuring and path", "How a set did, and where you are headed", "amber", []),
]
OLD_AREAS = "area IN ('writing', 'generating', 'rewriting', 'sets', 'stage', 'formats', 'progress')"

areas = sa.table(
    "craft_areas",
    sa.column("id", sa.Uuid()),
    sa.column("user_id", sa.Uuid()),
    sa.column("name", sa.String()),
    sa.column("description", sa.String()),
    sa.column("color", sa.String()),
    sa.column("screens", sa.JSON()),
    sa.column("position", sa.Integer()),
    sa.column("created_at", sa.DateTime(timezone=True)),
    sa.column("updated_at", sa.DateTime(timezone=True)),
)
notes = sa.table(
    "craft_notes",
    sa.column("user_id", sa.Uuid()),
    sa.column("area", sa.String()),
    sa.column("area_id", sa.Uuid()),
)
users = sa.table("users", sa.column("id", sa.Uuid()))


def create_areas_table() -> None:
    op.create_table(
        "craft_areas",
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=200), nullable=False),
        sa.Column("color", sa.String(length=20), nullable=False),
        sa.Column("screens", sa.JSON(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_craft_areas_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_craft_areas")),
    )
    op.create_index(op.f("ix_craft_areas_user_id"), "craft_areas", ["user_id"], unique=False)
    op.create_index(
        "uq_craft_areas_user_name", "craft_areas", ["user_id", sa.text("lower(name)")], unique=True
    )


def give_everyone_areas() -> None:
    """Every user gets the starting areas, and each note moves into the one matching its old key."""
    conn = op.get_bind()
    now = datetime.now(UTC)
    for (user_id,) in conn.execute(sa.select(users.c.id)).all():
        for position, (key, name, description, color, screens) in enumerate(AREAS):
            area_id = uuid.uuid4()
            conn.execute(
                areas.insert().values(
                    id=area_id,
                    user_id=user_id,
                    name=name,
                    description=description,
                    color=color,
                    screens=screens,
                    position=position,
                    created_at=now,
                    updated_at=now,
                )
            )
            conn.execute(
                notes.update()
                .where(notes.c.user_id == user_id, notes.c.area == key)
                .values(area_id=area_id)
            )


def upgrade() -> None:
    """Areas become rows you can edit; each note points at one instead of a fixed key."""
    create_areas_table()
    with op.batch_alter_table("craft_notes", schema=None) as batch_op:
        batch_op.add_column(sa.Column("area_id", sa.Uuid(), nullable=True))
    give_everyone_areas()
    with op.batch_alter_table("craft_notes", schema=None) as batch_op:
        batch_op.alter_column("area_id", existing_type=sa.Uuid(), nullable=False)
        batch_op.create_index(batch_op.f("ix_craft_notes_area_id"), ["area_id"], unique=False)
        batch_op.create_foreign_key(
            batch_op.f("fk_craft_notes_area_id_craft_areas"), "craft_areas", ["area_id"], ["id"]
        )
        batch_op.drop_constraint(batch_op.f("ck_craft_notes_area_values"), type_="check")
        batch_op.drop_column("area")


def downgrade() -> None:
    """Back to fixed keys: notes in a renamed or new area go to Writing."""
    with op.batch_alter_table("craft_notes", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("area", sa.String(length=20), server_default="writing", nullable=False)
        )
    conn = op.get_bind()
    for key, name, *_ in AREAS:
        ids = sa.select(areas.c.id).where(sa.func.lower(areas.c.name) == name.lower())
        conn.execute(notes.update().where(notes.c.area_id.in_(ids)).values(area=key))
    with op.batch_alter_table("craft_notes", schema=None) as batch_op:
        batch_op.create_check_constraint(batch_op.f("ck_craft_notes_area_values"), OLD_AREAS)
        batch_op.drop_constraint(
            batch_op.f("fk_craft_notes_area_id_craft_areas"), type_="foreignkey"
        )
        batch_op.drop_index(batch_op.f("ix_craft_notes_area_id"))
        batch_op.drop_column("area_id")
    op.drop_index("uq_craft_areas_user_name", table_name="craft_areas")
    op.drop_index(op.f("ix_craft_areas_user_id"), table_name="craft_areas")
    op.drop_table("craft_areas")
