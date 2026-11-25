"""Loading into an account a second time replaces all of it, not only what a load brings back.
Made-up material."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Observation, Premise, User
from app.seed.loader import Loader
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
