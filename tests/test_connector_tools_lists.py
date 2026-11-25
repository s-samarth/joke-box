"""Connector tools: ids that aren't there, long lists, and links into the Trash.
Made-up material."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.connector import library, notebook, study
from tests.conftest import signed_in
from tests.test_connector_tools import account
from tests.test_craft import note_in


@pytest.fixture
def dev() -> TestClient:
    return signed_in("dev@example.com")


def test_a_bad_id_is_listed_not_found_and_too_many_is_refused(db: Session, dev: TestClient) -> None:
    me = account(db, "dev@example.com")
    assert library.get_jokes(db, me, ["not-an-id"])["not_found"] == ["not-an-id"]
    with pytest.raises(ValueError, match="at most 20"):
        library.get_jokes(db, me, [str(uuid.uuid4()) for _ in range(21)])


def test_craft_lists_every_title_without_a_query(dev: TestClient, db: Session) -> None:
    """The tool promises every title with no query; it once stopped at 25."""
    for n in range(30):
        dev.put(f"/api/craft-notes/{uuid.uuid4()}", json=note_in(dev) | {"title": f"Fake {n}"})
    me = account(db, "dev@example.com")
    listed = study.search_craft(db, me)
    assert listed["total"] == len(listed["notes"]) >= 30
    assert len(study.search_craft(db, me, query="fake")["notes"]) == 25  # searches stay short


def test_observation_links_skip_what_is_in_the_trash(dev: TestClient, db: Session) -> None:
    topic = dev.get("/api/topics").json()[0]["id"]
    kept, binned, obs = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
    for premise in (kept, binned):
        dev.put(f"/api/premises/{premise}", json={"take": "Fake take", "topic_id": topic})
        dev.put(f"/api/observations/{obs}", json={"text": "Fake noticed"})
        dev.put(f"/api/observations/{obs}/links/premises/{premise}")
    dev.delete(f"/api/premises/{binned}")
    me = account(db, "dev@example.com")
    [found] = notebook.search_observations(db, me, "fake noticed")["observations"]
    assert found["premise_ids"] == [kept]
    origin = library.get_premise(db, me, kept)["from_observations"]
    assert origin == [{"id": obs, "text": "Fake noticed"}]
