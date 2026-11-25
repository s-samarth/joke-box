"""AGENTS.md: files stay under 200 lines. Migrations are exempt (append-only history, and the
first one holds the whole starting schema)."""

import subprocess
from pathlib import Path

ROOT = Path(__file__).parent.parent
CODE = (".py", ".ts", ".tsx", ".css", ".yml", ".sh")
LIMIT = 200


def test_every_code_file_stays_under_200_lines() -> None:
    tracked = subprocess.run(
        ["git", "ls-files", "-z"], cwd=ROOT, capture_output=True, text=True, check=True
    ).stdout.split("\0")
    files = [f for f in tracked if f.endswith(CODE) and not f.startswith("alembic/versions/")]
    assert files, "git listed no files"
    too_long = {
        f: n
        for f in files
        if (ROOT / f).exists() and (n := len((ROOT / f).read_text().splitlines())) > LIMIT
    }
    assert too_long == {}
