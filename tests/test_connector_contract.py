"""The connector's contract: every tool, called the way Claude calls it, over a full JokeBox.

Claude reads these results, and the comedy-writer skill is written against their field names.
So a change to a joke, premise, set or any other model that breaks a tool, or quietly changes
what it returns, must fail here first. If you change a tool's output on purpose, update the
expected fields (here and in tests/connector_fields.py) and the tool table in docs/api.md
together. Everything here is made up.
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests import connector_fields as fields
from tests.connector_auth import items, result, rpc
from tests.connector_fields import BRIEF, CLUSTER, DETAIL, PULSE, SET, TOOLS
from tests.connector_world import full_jokebox


@pytest.fixture
def claude(db: Session) -> Iterator[tuple[TestClient, str]]:
    yield from full_jokebox(db)


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
        "extra_notes",
        "vibe",
        "generic",
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
        "vibe",
        "generic",
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
    assert set(beat) == fields.BEAT
    kinds = {e["kind"]: e for b in opened["beats"] for e in b["entries"]}
    assert {k: set(e) for k, e in kinds.items()} == fields.ENTRIES
    assert set(items(kinds["premise"], "jokes")[0]) == fields.SET_JOKE
    question = items(kinds["crowd_work"], "questions")[0]
    assert set(question) == fields.QUESTION
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
