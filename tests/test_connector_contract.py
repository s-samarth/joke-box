"""The connector's contract: every tool, called the way Claude calls it, over a full JokeBox.

Claude reads these results, and the comedy-writer skill is written against their field names.
So a change to a joke, premise, set or any other model that breaks a tool, or quietly changes
what it returns, must fail here first. If you change a tool's output on purpose, update the
expected fields (here and in tests/connector_fields.py) and the tool table in docs/api.md
together. Everything here is made up.
"""

import json
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
from tests.connector_auth import connect, content, items, result, rpc
from tests.connector_fields import BEAT, BRIEF, CLUSTER, DETAIL, LONG, PULSE, SET, SET_JOKE, TOOLS
from tests.test_craft import note_in


def beats_set(jokes: list[dict[str, str]], premise: str) -> dict[str, object]:
    """A set with one of every kind of entry: a premise, jokes with no premise, crowd work."""
    piece = lambda n: {"id": f"p{n}", "joke_id": jokes[n]["id"], "gate": 1}  # noqa: E731
    question = {"id": "q", "text": "Fake question", "replies": [{"id": "r", "line": "Fake"}]}
    entries = [
        {"kind": "premise", "id": "e1", "premise_id": premise, "pieces": [piece(0), piece(1)]},
        {"kind": "jokes", "id": "e2", "pieces": [piece(2)]},
        {"kind": "crowd", "id": "e3", "title": "Fake", "questions": [question]},
    ]
    beat = {"id": "b", "cue": "Fake", "seconds": 90, "labels": {"status": "i-lose"}}
    return {"name": "Fake beats", "point": "Fake point", "beats": [beat | {"entries": entries}]}


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
    browser.put(f"/api/setlists/{uuid.uuid4()}", json=beats_set(jokes, premise))
    with TestClient(app) as client:
        yield client, connect(browser)["access_token"]


def test_every_tool_is_covered_here(claude: tuple[TestClient, str]) -> None:
    client, token = claude
    tools = {t["name"] for t in rpc(client, token, "tools/list").json()["result"]["tools"]}
    assert tools == TOOLS


def test_library_tools(claude: tuple[TestClient, str]) -> None:
    overview = result(claude, "jokebox_overview")
    assert set(overview) == {
        "jokes",
        "topics",
        "premises",
        "clusters",
        "sets",
        "shows_logged",
        "observations",
        "craft_areas",
        "statuses",
        "types",
    }
    assert set(items(overview, "topics")[0]) == {"name", "jokes", "subtopics"}

    found = result(claude, "search_jokes")
    assert set(found) == {"total", "next_offset", "jokes"}
    rest = result(claude, "search_jokes", offset=found["total"] - 1)
    assert len(rest["jokes"]) == 1 and rest["next_offset"] is None
    assert set(items(found, "jokes")[0]) == BRIEF
    ids = [j["id"] for j in found["jokes"]]
    full = result(claude, "get_jokes", ids=ids[:3])
    assert set(full) == {"jokes", "not_found"}
    assert all(set(j) == DETAIL for j in items(full, "jokes"))
    clustered = next(j for j in items(full, "jokes") if j["cluster"])
    assert set(clustered["cluster"]) == {"id", "title", "notes", "versions"}
    assert set(items(clustered["cluster"], "versions")[0]) == {"id", "setup", "status", "lead"}
    listed = result(claude, "list_clusters")
    assert set(listed) == {"total", "next_offset", "clusters"}
    assert set(items(listed, "clusters")[0]) == CLUSTER
    assert set(items(listed, "clusters")[0]["lead"]) == {"id", "setup"}
    assert set(items(listed, "clusters")[0]["shows"]) == {"shows_done", "killed", "ok"} | {
        "bombed",
        "last_done",
    }
    narrowed = result(claude, "search_jokes", cluster_id=clustered["cluster"]["id"])
    assert set(items(narrowed, "jokes")[0]) == BRIEF

    premises = result(claude, "list_premises")
    [premise] = items(premises, "premises")
    assert set(premise) == {"id", "take", "topic", "jokes", "status", "strength", "notes"} | {
        "extra_notes"
    }
    opened = result(claude, "get_premise", premise_id=premise["id"])
    assert set(opened) == {
        "id",
        "take",
        "notes",
        "extra_notes",
        "topic",
        "status",
        "strength",
        "from_observations",
        "jokes",
    }
    assert set(items(opened, "from_observations")[0]) == {"id", "text"}
    assert set(items(opened, "jokes")[0]) == BRIEF | {"follows_id"}


def test_pulse_tool(claude: tuple[TestClient, str]) -> None:
    out = result(claude, "writing_pulse")
    assert set(out) == PULSE
    assert set(out["where_everything_stands"]) == {"observations", "premises", "jokes"}
    assert set(items(out, "how_far_ideas_got")[0]) == {"step", "done", "of"}
    month = items(out, "month_on_month")[0]
    assert set(month) == {"month", "pieces_written", "steps", "still_settling"}
    assert out["when_you_write"] is None or set(out["when_you_write"]) == {
        "busiest",
        "of_pieces",
        "by_weekday",
    }
    # Nothing here sits idle; a sitting_idle row's fields are checked in test_connector_pulse.py.


def test_performing_tools(claude: tuple[TestClient, str]) -> None:
    sets = items(result(claude, "list_sets"), "sets")
    assert set(sets[0]) == SET
    opened = result(claude, "get_set", set_id=sets[0]["id"])
    assert set(opened) == SET | {"topics", "beats", "running_order"}
    first = items(opened, "running_order")[0]
    assert set(first) == BRIEF | {"place", "role", "optional", "loose", "premise", "follows_id"}
    beat = items(opened, "beats")[0]
    assert set(beat) == BEAT
    kinds = {e["kind"]: e for b in opened["beats"] for e in b["entries"]}
    assert set(kinds) == {"premise", "jokes_without_premise", "crowd_work"}
    assert set(kinds["premise"]) == {"kind", "premise_id", "premise", "jokes"} | {
        "only_if_previous_premise_landed"
    }
    assert set(kinds["jokes_without_premise"]) == {"kind", "jokes"}
    assert set(items(kinds["premise"], "jokes")[0]) == SET_JOKE
    assert set(kinds["crowd_work"]) == {"kind", "title", "questions"}
    question = items(kinds["crowd_work"], "questions")[0]
    assert set(question) == {"question", "has_reply", "replies"}
    assert set(items(question, "replies")[0]) == {"if_they_say", "line"}

    shows = result(claude, "list_shows")
    assert set(shows) == {
        "total",
        "next_offset",
        "average_lpm",
        "shows_with_laughs_counted",
        "shows",
    }
    assert set(items(shows, "shows")[0]) == {
        "show_id",
        "performed_at",
        "date",
        "venue",
        "minutes",
        "audience",
        "rating",
        "lpm",
        "laughs_by_points",
        "topics",
        "jokes",
        "reviewed_by",
        "learned",
        "notes",
    }


def test_notebook_and_study_tools(claude: tuple[TestClient, str]) -> None:
    observations = result(claude, "search_observations")
    fields = {"id", "text", "extra_notes", "topic", "kind", "strength", "status", "noted"}
    fields |= {"premise_ids", "joke_ids", "brainstorm_ids"}
    assert set(items(observations, "observations")[0]) == fields
    # Each voice note's fields are checked in test_connector_voice.py.
    assert set(result(claude, "search_voice_notes")) == {"total", "voice_notes"}

    found = items(result(claude, "search_brainstorms"), "results")
    by_kind = {r["kind"]: set(r) for r in found}
    assert by_kind["brainstorm"] == {
        "kind",
        "id",
        "title",
        "text",
        "technique",
        "linked_joke_ids",
        "handwritten_pages",
        "updated",
    }
    assert by_kind["rewrite"] == {"kind", "id", "joke_id", "title", "text", "updated"}

    brainstorm_id = next(r["id"] for r in found if r["kind"] == "brainstorm")
    blocks = content(claude, "get_brainstorm", brainstorm_id=brainstorm_id)
    assert set(json.loads(blocks[0]["text"])) == {
        "kind",
        "id",
        "title",
        "text",
        "text_length",
        "more_from_char",
        "technique",
        "linked_joke_ids",
        "linked_observation_ids",
        "updated",
        "handwritten_pages",
        "pages_shown",
        "more_from_page",
    }
    assert [b["type"] for b in blocks[1:]] == ["text", "image"]  # "Page 1", then the page
    rewrite_id = next(r["id"] for r in found if r["kind"] == "rewrite")
    [rewrite] = content(claude, "get_brainstorm", brainstorm_id=rewrite_id)
    assert set(json.loads(rewrite["text"])) == {
        "kind",
        "id",
        "joke_id",
        "joke_setup",
        "title",
        "text",
        "text_length",
        "more_from_char",
        "updated",
    }

    notes = items(result(claude, "search_craft"), "notes")
    assert set(notes[0]) == {"id", "title", "area", "kind", "hashtags", "preview"}
    full = items(result(claude, "get_craft_notes", ids=[notes[0]["id"]]), "notes")
    assert set(full[0]) == {"id", "title", "area", "kind", "hashtags", "source", "url"} | LONG

    analyses = items(result(claude, "search_analyses"), "analyses")
    assert set(analyses[0]) == {"id", "title", "routine", "preview", "updated"}
    analysis = result(claude, "get_analysis", analysis_id=analyses[0]["id"])
    assert set(analysis) == {"id", "title", "url", "routine"} | LONG
