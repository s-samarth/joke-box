"""Vercel build step: build the React app, then bring the database schema up to date.

Vercel runs this after installing the Python dependencies (see [tool.vercel.scripts]).
Only Production has a database (the Neon store is connected to Production alone), so a preview
build skips the migrations, and a preview app refuses to start without Postgres (app/config.py).
"""

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run(*cmd: str, cwd: Path = ROOT) -> None:
    print("$", " ".join(cmd), flush=True)
    subprocess.run(cmd, cwd=cwd, check=True)


def main() -> None:
    web = ROOT / "web"
    run("npm", "ci", cwd=web)
    run("npm", "run", "build", cwd=web)
    if os.environ.get("DATABASE_URL", "").startswith(("postgres://", "postgresql")):
        run(sys.executable, "-m", "alembic", "upgrade", "head")
    else:
        print("DATABASE_URL is not Postgres; skipping migrations.")


if __name__ == "__main__":
    main()
