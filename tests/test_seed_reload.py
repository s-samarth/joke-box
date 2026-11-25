"""Loading into an account a second time replaces all of it, not only what a load brings back.
Made-up material."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Observation, Premise, User
from app.seed.loader import Loader
from app.services.set_tags import DEFAULT_SET_TAGS
from tests.conftest import random_topic_id
from tests.test_premises import put_premise


def test_a_reload_leaves_no_premise_or_observation_behind(alice: TestClient, db: Session) -> None:
    premise = put_premise(alice, random_topic_id(alice)).json()["id"]
    noticed = str(uuid.uuid4())
    alice.put(f"/api/observations/{noticed}", json={"text": "Fake noticed"})
    alice.put(f"/api/observations/{noticed}/links/premises/{premise}")
    user = db.scalar(select(User).where(User.email == "alice@example.com"))
    assert user is not None
    Loader(db, user).run({"bits": [{"id": "b1", "setup": "Fake reload", "type": "One-liner"}]})
    db.commit()
    for model in (Premise, Observation):
        assert db.scalar(select(func.count()).select_from(model)) == 0
    assert alice.get("/api/jokes").status_code == 200


def test_a_reload_gives_back_the_starting_set_tags(alice: TestClient, db: Session) -> None:
    """The wipe takes the set tags too; a reload leaves them as a new account has them, so the
    screenshot script (which tags its demo sets) runs on a freshly seeded account."""
    user = db.scalar(select(User).where(User.email == "alice@example.com"))
    assert user is not None
    Loader(db, user).run({})
    db.commit()
    names = [t["name"] for t in alice.get("/api/set-tags").json()]
    assert names == DEFAULT_SET_TAGS
