"""The connector's contract for the notebook and study tools (see test_connector_contract.py,
which covers the rest and says when to change these). Everything here is made up."""

import json
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.connector_auth import content, items, result
from tests.connector_fields import LONG
from tests.connector_world import full_jokebox


@pytest.fixture
def claude(db: Session) -> Iterator[tuple[TestClient, str]]:
    yield from full_jokebox(db)


def test_notebook_and_study_tools(claude: tuple[TestClient, str]) -> None:
    observations = result(claude, "search_observations")
    fields = {"id", "text", "extra_notes", "topic", "kind", "strength", "status", "noted"}
    fields |= {"premise_ids", "joke_ids", "brainstorm_ids"}
    assert set(items(observations, "observations")[0]) == fields
    # Each voice note's fields are checked in test_connector_voice.py.
    paged = {"total", "next_offset"}  # each of these four pages with offset / next_offset
    assert set(observations) == paged | {"observations"}
    assert set(result(claude, "search_voice_notes")) == paged | {"voice_notes"}
    assert set(result(claude, "search_analyses")) == paged | {"analyses"}
    brainstorms = result(claude, "search_brainstorms")
    assert set(brainstorms) == paged | {"results"}

    found = items(brainstorms, "results")
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
