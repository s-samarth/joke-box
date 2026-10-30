"""connector sign-in: apps that registered for the Claude connector, and their tokens

Claude signs in to the connector with OAuth. connector_clients holds each registered app;
connector_tokens holds sign-in codes, access tokens and refresh tokens, stored as hashes.

Revision ID: 0024
Revises: 0023
Create Date: 2026-10-31 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0024"
down_revision: str | Sequence[str] | None = "0023"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "connector_clients",
        sa.Column("client_id", sa.String(length=64), nullable=False),
        sa.Column("info", sa.JSON(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_connector_clients")),
        sa.UniqueConstraint("client_id", name=op.f("uq_connector_clients_client_id")),
    )
    op.create_table(
        "connector_tokens",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("client_id", sa.String(length=64), nullable=False),
        sa.Column("kind", sa.String(length=10), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("scopes", sa.JSON(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["connector_clients.client_id"],
            name=op.f("fk_connector_tokens_client_id_connector_clients"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_connector_tokens_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_connector_tokens")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_connector_tokens_token_hash")),
    )
    with op.batch_alter_table("connector_tokens", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_connector_tokens_client_id"), ["client_id"])
        batch_op.create_index(batch_op.f("ix_connector_tokens_user_id"), ["user_id"])


def downgrade() -> None:
    with op.batch_alter_table("connector_tokens", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_connector_tokens_user_id"))
        batch_op.drop_index(batch_op.f("ix_connector_tokens_client_id"))
    op.drop_table("connector_tokens")
    op.drop_table("connector_clients")
