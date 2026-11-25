"""A JokeBox with one of everything, for the connector's contract test. Made-up material."""

import uuid
from collections.abc import Iterator

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.main import app
from app.models import User
from app.seed import reseed
from tests import connector_fields as fields
from tests.conftest import random_topic_id, signed_in
from tests.connector_auth import connect
from tests.test_craft import note_in


def full_jokebox(db: Session) -> Iterator[tuple[TestClient, str]]:
    """A JokeBox with something in every section (the demo set plus the rest), and a token."""
    browser = signed_in("dev@example.com")
    user = db.scalar(select(User).where(User.email == "dev@example.com"))
    assert user is not None
    reseed(db, user)
    jokes = browser.get("/api/jokes").json()
    premise = str(uuid.uuid4())
    browser.put(
        f"/api/premises/{premise}",
        json={"topic_id": random_topic_id(browser), "take": "Fake take", "notes": "Fake because"},
    )
    cluster = str(uuid.uuid4())
    browser.put(f"/api/clusters/{cluster}", json={"title": "Fake core"})
    for joke in jokes[:2]:  # two versions of one joke, the first resting on the premise
        on = premise if joke is jokes[0] else None
        browser.put(
            f"/api/jokes/{joke['id']}", json={**joke, "premise_id": on, "cluster_id": cluster}
        )
    browser.put(
        f"/api/brainstorms/{uuid.uuid4()}",
        json={"joke_id": jokes[0]["id"], "content": "Fake rewrite"},
    )
    page = {"color": "#ece6da", "size": 2.4, "page": 0, "points": [[10, 20, 0.5], [60, 80, 0.7]]}
    session = {"title": "Fake", "content": "Fake page", "ink": [page]}
    browser.put(f"/api/sessions/{uuid.uuid4()}", json=session)
    noticed = str(uuid.uuid4())
    browser.put(f"/api/observations/{noticed}", json={"text": "Fake noticed"})
    browser.put(f"/api/observations/{noticed}/links/premises/{premise}")
    browser.put(f"/api/craft-notes/{uuid.uuid4()}", json=note_in(browser) | {"title": "Fake"})
    browser.put(f"/api/analyses/{uuid.uuid4()}", json={"title": "Fake", "body": "Fake why"})
    browser.put(f"/api/setlists/{uuid.uuid4()}", json=fields.beats_set(jokes, premise))
    with TestClient(app) as client:
        yield client, connect(browser)["access_token"]
