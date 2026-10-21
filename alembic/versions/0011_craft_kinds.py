"""craft kinds you can edit

Revision ID: 0011
Revises: 0010
Create Date: 2026-10-21 22:00:00.000000

"""

import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0011"
down_revision: str | Sequence[str] | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# The fixed kinds so far, as each user's starting kinds: (behaviour, name).
KINDS = [
    ("checklist", "Checklist"),
    ("technique", "Technique"),
    ("reference", "Reference"),
    ("path", "Path"),
]
BEHAVIOURS = "behaviour IN ('checklist', 'technique', 'reference', 'path')"
OLD_KINDS = "kind IN ('checklist', 'technique', 'reference', 'path')"

kinds = sa.table(
    "craft_kinds",
    sa.column("id", sa.Uuid()),
    sa.column("user_id", sa.Uuid()),
    sa.column("name", sa.String()),
    sa.column("behaviour", sa.String()),
    sa.column("position", sa.Integer()),
    sa.column("created_at", sa.DateTime(timezone=True)),
    sa.column("updated_at", sa.DateTime(timezone=True)),
)
notes = sa.table(
    "craft_notes",
    sa.column("user_id", sa.Uuid()),
    sa.column("kind", sa.String()),
    sa.column("kind_id", sa.Uuid()),
)
users = sa.table("users", sa.column("id", sa.Uuid()))


def create_kinds_table() -> None:
    op.create_table(
        "craft_kinds",
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("behaviour", sa.String(length=20), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(BEHAVIOURS, name=op.f("ck_craft_kinds_behaviour_values")),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_craft_kinds_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_craft_kinds")),
    )
    op.create_index(op.f("ix_craft_kinds_user_id"), "craft_kinds", ["user_id"], unique=False)
    op.create_index(
        "uq_craft_kinds_user_name", "craft_kinds", ["user_id", sa.text("lower(name)")], unique=True
    )


def give_everyone_kinds() -> None:
    """Every user gets the starting kinds, and each note moves to the one matching its old kind."""
    conn = op.get_bind()
    now = datetime.now(UTC)
    for (user_id,) in conn.execute(sa.select(users.c.id)).all():
        for position, (behaviour, name) in enumerate(KINDS):
            kind_id = uuid.uuid4()
            conn.execute(
                kinds.insert().values(
                    id=kind_id,
                    user_id=user_id,
                    name=name,
                    behaviour=behaviour,
                    position=position,
                    created_at=now,
                    updated_at=now,
                )
            )
            conn.execute(
                notes.update()
                .where(notes.c.user_id == user_id, notes.c.kind == behaviour)
                .values(kind_id=kind_id)
            )


def upgrade() -> None:
    """Kinds become rows you can edit; each note points at one, and the kind keeps the behaviour."""
    create_kinds_table()
    with op.batch_alter_table("craft_notes", schema=None) as batch_op:
        batch_op.add_column(sa.Column("kind_id", sa.Uuid(), nullable=True))
    give_everyone_kinds()
    with op.batch_alter_table("craft_notes", schema=None) as batch_op:
        batch_op.alter_column("kind_id", existing_type=sa.Uuid(), nullable=False)
        batch_op.create_index(batch_op.f("ix_craft_notes_kind_id"), ["kind_id"], unique=False)
        batch_op.create_foreign_key(
            batch_op.f("fk_craft_notes_kind_id_craft_kinds"), "craft_kinds", ["kind_id"], ["id"]
        )
        batch_op.drop_constraint(batch_op.f("ck_craft_notes_kind_values"), type_="check")
        batch_op.drop_column("kind")


def downgrade() -> None:
    """Back to fixed kinds: each note takes its kind's behaviour."""
    with op.batch_alter_table("craft_notes", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("kind", sa.String(length=20), server_default="reference", nullable=False)
        )
    conn = op.get_bind()
    for behaviour, _ in KINDS:
        ids = sa.select(kinds.c.id).where(kinds.c.behaviour == behaviour)
        conn.execute(notes.update().where(notes.c.kind_id.in_(ids)).values(kind=behaviour))
    with op.batch_alter_table("craft_notes", schema=None) as batch_op:
        batch_op.create_check_constraint(batch_op.f("ck_craft_notes_kind_values"), OLD_KINDS)
        batch_op.drop_constraint(
            batch_op.f("fk_craft_notes_kind_id_craft_kinds"), type_="foreignkey"
        )
        batch_op.drop_index(batch_op.f("ix_craft_notes_kind_id"))
        batch_op.drop_column("kind_id")
    op.drop_index("uq_craft_kinds_user_name", table_name="craft_kinds")
    op.drop_index(op.f("ix_craft_kinds_user_id"), table_name="craft_kinds")
    op.drop_table("craft_kinds")
