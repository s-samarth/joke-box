"""Strength on premises and observations, and a premise's own status (Draft to Discarded)."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.connector import library, notebook
from tests.conftest import signed_in
from tests.test_connector_tools import account
from tests.test_jokes import put_joke
from tests.test_observations import put_obs
from tests.test_premises import new_topic, put_premise


@pytest.fixture
def dev() -> TestClient:
    return signed_in("dev@example.com")


def test_a_premise_starts_an_unrated_draft(alice: TestClient) -> None:
    made = put_premise(alice, new_topic(alice, "Fake family")).json()
    assert (made["strength"], made["status"]) == (None, "Draft")


def test_strength_and_status_save_and_an_older_app_keeps_them(alice: TestClient) -> None:
    topic, pid = new_topic(alice, "Fake family"), str(uuid.uuid4())
    put_premise(alice, topic, pid, strength=4, status="Stage Ready")
    # An app from before strength and status sends neither: what's stored stays.
    kept = put_premise(alice, topic, pid, take="Fake take, edited").json()
    assert (kept["strength"], kept["status"]) == (4, "Stage Ready")
    cleared = put_premise(alice, topic, pid, strength=None).json()
    assert (cleared["strength"], cleared["status"]) == (None, "Stage Ready")


def test_only_the_four_statuses_and_strengths_one_to_five(alice: TestClient) -> None:
    topic = new_topic(alice, "Fake family")
    assert put_premise(alice, topic, status="Complete").status_code == 422
    assert put_premise(alice, topic, strength=6).status_code == 422
    assert put_obs(alice, strength=0).status_code == 422


def test_a_discarded_premise_leaves_its_jokes_alone(alice: TestClient) -> None:
    topic, pid = new_topic(alice, "Fake family"), str(uuid.uuid4())
    put_premise(alice, topic, pid)
    joke = put_joke(alice, setup="Fake setup", premise_id=pid, status="Draft").json()
    put_premise(alice, topic, pid, status="Discarded")
    [after] = [j for j in alice.get("/api/jokes").json() if j["id"] == joke["id"]]
    assert (after["premise_id"], after["status"]) == (pid, "Draft")


def test_an_observation_keeps_its_strength(alice: TestClient) -> None:
    oid = str(uuid.uuid4())
    assert put_obs(alice, oid).json()["strength"] is None
    assert put_obs(alice, oid, strength=3).json()["strength"] == 3
    assert put_obs(alice, oid, text="Fake edited").json()["strength"] == 3  # an older app


def test_claude_can_narrow_by_status_and_strength(dev: TestClient, db: Session) -> None:
    topic = new_topic(dev, "Fake weddings")
    put_premise(dev, topic, take="Fake strong", strength=5, status="Testing")
    put_premise(dev, topic, take="Fake weak", strength=1)
    put_obs(dev, text="Fake sharp noticing", strength=4)
    me = account(db, "dev@example.com")
    testing = library.list_premises(db, me, status="testing")["premises"]
    assert [(p["take"], p["strength"]) for p in testing] == [("Fake strong", 5)]
    strong = library.list_premises(db, me, topic="fake weddings", min_strength=4)["premises"]
    assert [p["take"] for p in strong] == ["Fake strong"]
    [seen] = notebook.search_observations(db, me, "fake sharp", min_strength=4)["observations"]
    assert seen["strength"] == 4
