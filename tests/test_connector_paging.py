"""Connector fixes: logging a show again, leads_only, and paging the notebook searches.
The material is made up."""

import uuid
from typing import Any

from tests.connector_auth import call, connect
from tests.test_clusters import new
from tests.test_connector_log_show import Engine, engine, show

__all__ = ["engine"]  # the fixture, used by name below


def out(engine: Engine, tool: str, token: str | None = None, **args: Any) -> Any:
    _, client, logger, _ = engine
    return call(client, token or logger, tool, **args)


def test_the_same_show_logged_twice_without_its_id_is_one_show(engine: Engine) -> None:
    browser, _, _, jokes = engine
    first = out(engine, "log_show", **show(jokes))["structuredContent"]
    again = out(engine, "log_show", **show(jokes, rating=5))["structuredContent"]
    assert first["show_id"] == again["show_id"]
    assert [s["rating"] for s in browser.get("/api/logs").json()] == [5]


def test_a_hand_logged_shows_first_review_keeps_what_was_written(engine: Engine) -> None:
    browser, _, _, jokes = engine
    show_id = str(uuid.uuid4())
    by_hand = {"venue_name": "Fake Cafe", "performed_at": "2026-11-18T16:00:00Z"}
    by_hand |= {"notes": "Fake hand note", "learned": "Fake lesson"}
    assert browser.put(f"/api/logs/{show_id}", json=by_hand).status_code == 200
    reviewed = show(jokes, show_id=show_id, notes="Fake review note", learned="Fake new lesson")
    assert not out(engine, "log_show", **reviewed)["isError"]
    saved = browser.get("/api/logs").json()[0]
    assert saved["notes"] == "Fake hand note\n\nFake review note"
    assert saved["learned"] == "Fake lesson\n\nFake new lesson"


def test_a_bad_show_date_is_a_readable_error(engine: Engine) -> None:
    answer = out(engine, "log_show", **show(engine[3], performed_at="last Tuesday"))
    assert answer["isError"] and "ISO date" in answer["content"][0]["text"]


def test_leads_only_keeps_a_cluster_whose_lead_didnt_match(engine: Engine) -> None:
    browser = engine[0]
    cid, (_, second) = new(browser, "Fake lead words", "Fake zebra words")
    claude = connect(browser)["access_token"]
    found = out(engine, "search_jokes", claude, query="zebra", leads_only=True)
    assert [j["id"] for j in found["structuredContent"]["jokes"]] == [second]


def test_observations_come_a_page_at_a_time(engine: Engine) -> None:
    browser = engine[0]
    for n in range(3):
        browser.put(f"/api/observations/{uuid.uuid4()}", json={"text": f"Fake noticing {n}"})
    claude = connect(browser)["access_token"]
    first = out(engine, "search_observations", claude, limit=2)["structuredContent"]
    rest = out(engine, "search_observations", claude, limit=2, offset=first["next_offset"])
    assert first["next_offset"] == 2 and len(rest["structuredContent"]["observations"]) == 1
    assert rest["structuredContent"]["next_offset"] is None
