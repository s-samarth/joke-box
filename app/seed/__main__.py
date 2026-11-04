"""Load data into one account. Uses DATABASE_URL, so it works locally or against Neon.

    uv run python -m app.seed dev@example.com                     # demo data
    uv run python -m app.seed you@gmail.com --file export.json    # your Bit Vault export
    uv run python -m app.seed you@gmail.com --file export.json --dry-run

Loading replaces everything in that account. Against a database that isn't on this machine it
also needs --replace-remote-account (see guard.py); --dry-run never does.
"""

import argparse
import json
import sys
from pathlib import Path

from sqlalchemy import select

from app.auth.bootstrap import upsert_user
from app.config import get_settings
from app.db import SessionLocal
from app.models import User
from app.seed import DEMO
from app.seed.guard import CONFIRM_FLAG, refusal
from app.seed.loader import Loader

parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
parser.add_argument("email")
parser.add_argument("--file", type=Path, default=DEMO, help="JSON in the Bit Vault export shape")
parser.add_argument("--dry-run", action="store_true", help="show what would load, then roll back")
parser.add_argument(CONFIRM_FLAG, action="store_true", help="allow a database on another machine")
args = parser.parse_args()

url = get_settings().database_url
refused = refusal(url, args.email, args.replace_remote_account, args.dry_run)
if refused:
    sys.exit(refused)

with SessionLocal() as session:
    user = session.scalar(select(User).where(User.email == args.email.lower()))
    if user is None:
        user = upsert_user(session, email=args.email, google_sub=None, name="", avatar="")
    loader = Loader(session, user)
    loader.run(json.loads(args.file.read_text()))
    print(f"{'Would load' if args.dry_run else 'Loaded'} for {args.email}: {loader.report}")
    for line in loader.skipped:
        print("  skipped:", line)
    if args.dry_run:
        session.rollback()
    else:
        session.commit()
