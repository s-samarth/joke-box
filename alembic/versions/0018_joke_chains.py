"""a joke can follow another joke

Each joke may name the one it continues from. Many jokes can follow the same one, so chains
branch into trees. Deleting a joke for good leaves the ones after it standing on their own.

Revision ID: 0018
Revises: 0017
Create Date: 2026-10-23 21:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0018"
down_revision: str | Sequence[str] | None = "0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("bits") as batch:
        batch.add_column(sa.Column("follows_id", sa.Uuid(), nullable=True))
        batch.create_foreign_key(
            "fk_bits_follows_id_bits", "bits", ["follows_id"], ["id"], ondelete="SET NULL"
        )
        batch.create_index("ix_bits_follows_id", ["follows_id"])


def downgrade() -> None:
    with op.batch_alter_table("bits") as batch:
        batch.drop_index("ix_bits_follows_id")
        batch.drop_constraint("fk_bits_follows_id_bits", type_="foreignkey")
        batch.drop_column("follows_id")
