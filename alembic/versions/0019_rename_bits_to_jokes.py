"""call them jokes everywhere: bits become jokes in tables, columns, indexes and constraints

Only names change; every row stays where it is. Postgres renames in place. SQLite renames tables
and columns in place too, but can't rename an index, so those are dropped and made again (its
constraint names live inside each table's definition and stay as they were, which is harmless).

Revision ID: 0019
Revises: 0018
Create Date: 2026-10-23 23:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0019"
down_revision: str | Sequence[str] | None = "0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLES = [("bits", "jokes"), ("bit_types", "joke_types"), ("bit_type_links", "joke_type_links")]
# (table after the rename, old column, new column)
COLUMNS = [
    ("joke_type_links", "bit_id", "joke_id"),
    ("brainstorms", "bit_id", "joke_id"),
    ("setlist_items", "bit_id", "joke_id"),
    ("writing_sessions", "bit_ids", "joke_ids"),
]
# (table after the rename, old name, new name)
CONSTRAINTS = [
    ("jokes", "pk_bits", "pk_jokes"),
    ("jokes", "ck_bits_clean_rating_values", "ck_jokes_clean_rating_values"),
    ("jokes", "ck_bits_strength_range", "ck_jokes_strength_range"),
    ("jokes", "fk_bits_status_id_statuses", "fk_jokes_status_id_statuses"),
    ("jokes", "fk_bits_subtopic_id_subtopics", "fk_jokes_subtopic_id_subtopics"),
    ("jokes", "fk_bits_topic_id_topics", "fk_jokes_topic_id_topics"),
    ("jokes", "fk_bits_user_id_users", "fk_jokes_user_id_users"),
    ("jokes", "fk_bits_follows_id_bits", "fk_jokes_follows_id_jokes"),
    ("joke_types", "pk_bit_types", "pk_joke_types"),
    ("joke_types", "fk_bit_types_user_id_users", "fk_joke_types_user_id_users"),
    ("joke_type_links", "pk_bit_type_links", "pk_joke_type_links"),
    ("joke_type_links", "fk_bit_type_links_bit_id_bits", "fk_joke_type_links_joke_id_jokes"),
    (
        "joke_type_links",
        "fk_bit_type_links_type_id_bit_types",
        "fk_joke_type_links_type_id_joke_types",
    ),
    ("brainstorms", "fk_brainstorms_bit_id_bits", "fk_brainstorms_joke_id_jokes"),
    ("setlist_items", "fk_setlist_items_bit_id_bits", "fk_setlist_items_joke_id_jokes"),
]
# (table after the rename, old name, new name, columns or expression, unique)
INDEXES = [
    ("jokes", "ix_bits_topic_id", "ix_jokes_topic_id", ["topic_id"], False),
    ("jokes", "ix_bits_user_id", "ix_jokes_user_id", ["user_id"], False),
    ("jokes", "ix_bits_follows_id", "ix_jokes_follows_id", ["follows_id"], False),
    ("jokes", "ix_bits_deleted_at", "ix_jokes_deleted_at", ["deleted_at"], False),
    ("joke_types", "ix_bit_types_user_id", "ix_joke_types_user_id", ["user_id"], False),
    (
        "joke_types",
        "uq_bit_types_user_name",
        "uq_joke_types_user_name",
        ["user_id", sa.text("lower(name)")],
        True,
    ),
    ("brainstorms", "ix_brainstorms_bit_id", "ix_brainstorms_joke_id", ["joke_id"], False),
]


def old_table(table: str) -> str:
    return {new: old for old, new in TABLES}.get(table, table)


def old_column(col: str | sa.TextClause) -> str | sa.TextClause:
    return {new: old for _, old, new in COLUMNS}.get(col, col) if isinstance(col, str) else col


def is_postgres() -> bool:
    return op.get_bind().dialect.name == "postgresql"


def upgrade() -> None:
    for old, new in TABLES:
        op.rename_table(old, new)
    for table, old, new in COLUMNS:
        op.execute(f'ALTER TABLE {table} RENAME COLUMN "{old}" TO "{new}"')
    if is_postgres():
        for table, old, new in CONSTRAINTS:
            op.execute(f'ALTER TABLE {table} RENAME CONSTRAINT "{old}" TO "{new}"')
    for table, old, new, cols, unique in INDEXES:
        if is_postgres():
            op.execute(f'ALTER INDEX "{old}" RENAME TO "{new}"')
        else:
            op.drop_index(old, table_name=table)
            op.create_index(new, table, cols, unique=unique)


def downgrade() -> None:
    if is_postgres():
        for table, old, new in CONSTRAINTS:
            op.execute(f'ALTER TABLE {table} RENAME CONSTRAINT "{new}" TO "{old}"')
        for _, old, new, _, _ in INDEXES:
            op.execute(f'ALTER INDEX "{new}" RENAME TO "{old}"')
    else:
        for table, _, new, _, _ in INDEXES:
            op.drop_index(new, table_name=table)
    for table, old, new in COLUMNS:
        op.execute(f'ALTER TABLE {table} RENAME COLUMN "{new}" TO "{old}"')
    for old, new in TABLES:
        op.rename_table(new, old)
    if not is_postgres():
        for table, old, _, cols, unique in INDEXES:
            op.create_index(old, old_table(table), [old_column(c) for c in cols], unique=unique)
