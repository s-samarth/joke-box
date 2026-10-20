"""Demo data for local development, and importing an old Bit Vault export.

The demo content is the fake set from the original Bit Vault, never real material.
"""

import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import User
from app.seed.loader import Loader

DEMO = Path(__file__).with_name("demo.json")


def reseed(db: Session, user: User) -> None:
    """Wipe the user's data and load the demo set."""
    Loader(db, user).run(json.loads(DEMO.read_text()))
    db.commit()
