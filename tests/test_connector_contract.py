"""The connector's contract: every tool, called the way Claude calls it, over a full JokeBox.

Claude reads these results, and the comedy-writer skill is written against their field names.
So a change to a joke, premise, set or any other model that breaks a tool, or quietly changes
what it returns, must fail here first. If you change a tool's output on purpose, update the
expected fields below and the tool table in docs/api.md together. Everything here is made up.
"""

import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.main import app
from app.models import User
from app.seed import reseed
from tests.conftest import random_topic_id, signed_in
from tests.connector_auth import connect, items, result, rpc
from tests.test_craft import note_in

BRIEF = {
    "id",
    "setup",
    "punchline",
    "topic",
    "subtopic",
    "premise_id",
    "status",
    "strength",
    "seconds",
    "types",
}
DETAIL = BRIEF | {
    "tag_lines",
    "hashtags",
    "notes",
    "premise",
    "clean_rating",
    "language",
    "follows",
    "followed_by",
    "in_sets",
    "rewrites",
}
SET = {
    "id",
    "name",
    "tags",
    "rating",
    "venue",
    "target_seconds",
    "runtime_seconds",
    "jokes",
    "updated",
}


@pytest.fixture
def claude(db: Session) -> Iterator[tuple[TestClient, str]]:
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
    browser.put(f"/api/jokes/{jokes[0]['id']}", json={**jokes[0], "premise_id": premise})
    browser.put(
        f"/api/brainstorms/{uuid.uuid4()}",
        json={"joke_id": jokes[0]["id"], "content": "Fake rewrite"},
    )
    browser.put(f"/api/sessions/{uuid.uuid4()}", json={"title": "Fake", "content": "Fake page"})
    browser.put(f"/api/observations/{uuid.uuid4()}", json={"text": "Fake noticed"})
    browser.put(f"/api/craft-notes/{uuid.uuid4()}", json=note_in(browser) | {"title": "Fake"})
    browser.put(f"/api/analyses/{uuid.uuid4()}", json={"title": "Fake", "body": "Fake why"})
    with TestClient(app) as client:
        yield client, connect(browser)["access_token"]


def test_every_tool_is_covered_here(claude: tuple[TestClient, str]) -> None:
    client, token = claude
    tools = {t["name"] for t in rpc(client, token, "tools/list").json()["result"]["tools"]}
    assert tools == {
        "jokebox_overview",
        "search_jokes",
        "get_jokes",
        "list_premises",
        "get_premise",
        "list_sets",
        "get_set",
        "list_shows",
        "search_observations",
        "search_brainstorms",
        "search_craft",
        "get_craft_notes",
        "search_analyses",
        "get_analysis",
    }


def test_library_tools(claude: tuple[TestClient, str]) -> None:
    overview = result(claude, "jokebox_overview")
    assert set(overview) == {
        "jokes",
        "topics",
        "premises",
        "sets",
        "shows_logged",
        "observations",
        "craft_areas",
        "statuses",
        "types",
    }
    assert set(items(overview, "topics")[0]) == {"name", "jokes", "subtopics"}

    found = result(claude, "search_jokes")
    assert set(found) == {"total", "jokes"}
    assert set(items(found, "jokes")[0]) == BRIEF
    ids = [j["id"] for j in found["jokes"]]
    full = result(claude, "get_jokes", ids=ids[:3])
    assert set(full) == {"jokes", "not_found"}
    assert all(set(j) == DETAIL for j in items(full, "jokes"))

    premises = result(claude, "list_premises")
    [premise] = items(premises, "premises")
    assert set(premise) == {"id", "take", "topic", "jokes", "notes"}
    opened = result(claude, "get_premise", premise_id=premise["id"])
    assert set(opened) == {"id", "take", "notes", "topic", "jokes"}
    assert set(items(opened, "jokes")[0]) == BRIEF | {"follows_id"}


def test_performing_tools(claude: tuple[TestClient, str]) -> None:
    sets = items(result(claude, "list_sets"), "sets")
    assert set(sets[0]) == SET
    opened = result(claude, "get_set", set_id=sets[0]["id"])
    assert set(opened) == SET | {"topics", "running_order"}
    first = items(opened, "running_order")[0]
    assert set(first) == BRIEF | {"place", "role", "optional", "premise", "follows_id"}

    shows = result(claude, "list_shows")
    assert set(shows) == {"total", "average_lpm", "shows_with_laughs_counted", "shows"}
    assert set(items(shows, "shows")[0]) == {
        "date",
        "venue",
        "minutes",
        "audience",
        "rating",
        "lpm",
        "laughs_by_points",
        "topics",
        "notes",
    }


def test_notebook_and_study_tools(claude: tuple[TestClient, str]) -> None:
    observations = result(claude, "search_observations")
    assert set(items(observations, "observations")[0]) == {"id", "text", "topic", "noted"}

    found = items(result(claude, "search_brainstorms"), "results")
    by_kind = {r["kind"]: set(r) for r in found}
    assert by_kind["brainstorm"] == {
        "kind",
        "id",
        "title",
        "text",
        "technique",
        "linked_joke_ids",
        "updated",
    }
    assert by_kind["rewrite"] == {"kind", "id", "joke_id", "title", "text", "updated"}

    notes = items(result(claude, "search_craft"), "notes")
    assert set(notes[0]) == {"id", "title", "area", "kind", "hashtags", "preview"}
    full = items(result(claude, "get_craft_notes", ids=[notes[0]["id"]]), "notes")
    assert set(full[0]) == {"id", "title", "area", "kind", "hashtags", "source", "url", "body"}

    analyses = items(result(claude, "search_analyses"), "analyses")
    assert set(analyses[0]) == {"id", "title", "routine", "preview", "updated"}
    analysis = result(claude, "get_analysis", analysis_id=analyses[0]["id"])
    assert set(analysis) == {"id", "title", "url", "routine", "body"}
