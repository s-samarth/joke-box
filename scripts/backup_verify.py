"""Prove a night's database dump restores, before it is encrypted and kept.

    uv run python scripts/backup_verify.py SOURCE_URL_FILE RESTORED_URL

Run by .github/workflows/backup.yml after pg_restore has loaded the dump into a throwaway
Postgres on the runner. Counts the rows of every table in both the live database and the
restored copy, and compares them:

- a table missing from the copy, or an extra one, stops the backup;
- a table with rows live but none in the copy stops the backup;
- any other difference is only a warning: a phone syncing during the dump can add a row.

SOURCE_URL_FILE is a file holding the live database's URL, so it never appears in a process
list. It prints only how many tables matched and the names of tables that differ, never a row
count: this repository is public, and so are its Actions logs.
"""

import sys
from pathlib import Path

import psycopg
from psycopg import sql


def row_counts(url: str) -> dict[str, int]:
    """Every table in the public schema and its number of rows."""
    with psycopg.connect(url) as conn:
        names = [
            row[0]
            for row in conn.execute(
                "select tablename from pg_tables where schemaname = 'public' order by tablename"
            )
        ]
        counts: dict[str, int] = {}
        for name in names:
            query = sql.SQL("select count(*) from {}").format(sql.Identifier("public", name))
            row = conn.execute(query).fetchone()
            counts[name] = row[0] if row else 0
        return counts


def compare(live: dict[str, int], copy: dict[str, int]) -> tuple[list[str], list[str]]:
    """(errors, warnings) from comparing the live row counts with the restored ones."""
    errors: list[str] = []
    missing = sorted(live.keys() - copy.keys())
    extra = sorted(copy.keys() - live.keys())
    if missing:
        errors.append(f"Tables missing from the restored copy: {', '.join(missing)}")
    if extra:
        errors.append(f"Tables only in the restored copy: {', '.join(extra)}")
    shared = sorted(live.keys() & copy.keys())
    emptied = [name for name in shared if live[name] > 0 and copy[name] == 0]
    if emptied:
        errors.append(f"Tables with rows live but empty in the copy: {', '.join(emptied)}")
    differ = [name for name in shared if name not in emptied and live[name] != copy[name]]
    warnings = []
    if differ:
        warnings.append(
            f"Row counts changed during the dump in: {', '.join(differ)} (something was saved)"
        )
    return errors, warnings


def main(source_file: str, restored_url: str) -> int:
    live = row_counts(Path(source_file).read_text().strip())
    copy = row_counts(restored_url)
    errors, warnings = compare(live, copy)
    for line in warnings:
        print(f"::warning::{line}")
    for line in errors:
        print(f"::error::{line}. Nothing was backed up.")
    if errors:
        return 1
    if len(live) < 10:
        print(f"::error::The live database has only {len(live)} tables. Nothing was backed up.")
        return 1
    print(f"Restore check: all {len(live)} tables came back")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: backup_verify.py SOURCE_URL_FILE RESTORED_URL")
    sys.exit(main(sys.argv[1], sys.argv[2]))
