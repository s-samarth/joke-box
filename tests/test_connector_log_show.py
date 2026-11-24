"""log_show, the connector's one write: only a connection allowed to log shows (the set-review
engine) can call it, and it saves a show the way the app does, plus the laugh timeline. The
fields it returns are part of the connector's contract. Everything here is made up."""

import uuid
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import signed_in
from tests.connector_auth import authorize, call, connect, register
from tests.test_jokes import put_joke

Engine = tuple[TestClient, TestClient, str, list[str]]


@pytest.fixture
def engine(db: Any) -> Iterator[Engine]:
    """The comic signed in, the MCP endpoint, a token allowed to log shows, and two jokes."""
    browser = signed_in("dev@example.com")
    jokes = [put_joke(browser, setup=f"Fake bit {n}").json()["id"] for n in range(2)]
    token = connect(browser, "read shows")["access_token"]
    with TestClient(app) as client:
        yield browser, client, token, jokes


def show(jokes: list[str], **changes: Any) -> dict[str, Any]:
    a, b = jokes
    return {
        "performed_at": "2026-11-18T21:30:00",
        "venue": "Fake Cafe",
        "duration_seconds": 600,
        "audience_size": 12,
        "rating": 4,
        "laughs": [3, 2, 1, 0, 0],
        "jokes": [
            {"joke_id": a, "result": "killed", "suggested_result": "ok", "note": "Fake note"},
            {"joke_id": b, "result": None, "suggested_result": "bombed"},
        ],
        "engine_version": "1.0.0+t1",
        "events": [
            {"start": 61.5, "end": 64.0, "kind": "laugh", "points": 3, "joke_id": a},
            {"start": 30.0, "end": 31.0, "kind": "laugh", "points": 1, "joke_id": a},
            {"start": 300.0, "end": 305.0, "kind": "applause", "points": 4, "joke_id": None},
        ],
        **changes,
    }


def test_a_read_only_connection_cant_log_a_show(engine: Engine) -> None:
    browser, client, _, jokes = engine
    claude = connect(browser)["access_token"]
    out = call(client, claude, "log_show", **show(jokes))
    assert out["isError"] and "set-review engine" in out["content"][0]["text"]
    assert browser.get("/api/logs").json() == []


def test_the_engine_logs_a_show_with_its_laughs(engine: Engine) -> None:
    browser, client, token, (a, b) = engine
    out = call(client, token, "log_show", **show([a, b]))
    assert not out.get("isError"), out
    logged = out["structuredContent"]
    assert set(logged) == {
        "show_id",
        "date",
        "venue",
        "topics",
        "learned",
        "lpm",
        "jokes_logged",
        "events_kept",
    }
    assert logged["date"] == "2026-11-18" and logged["lpm"] == 1.0
    saved = browser.get("/api/logs").json()[0]
    assert saved["venue_name"] == "Fake Cafe" and "title" not in saved
    assert [(j["result"], j["suggested_result"]) for j in saved["jokes"]] == [
        ("killed", "ok"),
        (None, "bombed"),
    ]
    events = saved["review"]["events"]
    assert [e["start"] for e in events] == [30.0, 61.5, 300.0]
    listed = call(client, token, "list_shows")["structuredContent"]["shows"][0]
    assert listed["reviewed_by"] == "1.0.0+t1"
    assert [j["laugh_points"] for j in listed["jokes"]] == [4, 0]


def test_logging_again_replaces_the_show(engine: Engine) -> None:
    browser, client, token, jokes = engine
    first = call(client, token, "log_show", **show(jokes))["structuredContent"]["show_id"]
    again = show(jokes, show_id=first, rating=2, events=[])
    assert call(client, token, "log_show", **again)["structuredContent"]["events_kept"] == 0
    shows = browser.get("/api/logs").json()
    assert len(shows) == 1 and shows[0]["rating"] == 2


def test_someone_elses_joke_is_left_out_and_its_laughs_credited_to_nothing(
    engine: Engine,
) -> None:
    browser, client, token, (a, _) = engine
    stranger = put_joke(signed_in("other@example.com"), setup="Fake other").json()["id"]
    sent = show([a, stranger])
    out = call(client, token, "log_show", **sent)["structuredContent"]
    assert out["jokes_logged"] == 1
    saved = browser.get("/api/logs").json()[0]
    assert [j["joke_id"] for j in saved["jokes"]] == [a]


def test_a_bad_show_comes_back_as_a_readable_error(engine: Engine) -> None:
    _, client, token, jokes = engine
    out = call(client, token, "log_show", **show(jokes, laughs=[1, 2]))
    assert out["isError"] and "laughs" in out["content"][0]["text"]
    out = call(client, token, "log_show", **show(jokes, show_id=str(uuid.uuid4()), rating=9))
    assert out["isError"] and "rating" in out["content"][0]["text"]


def test_the_consent_page_says_when_an_app_will_log_shows(db: Any) -> None:
    browser = signed_in("dev@example.com")
    client_id = register(browser, scope="read shows").json()["client_id"]
    asks = browser.get(authorize(browser, client_id, "v" * 50, scope="read shows")).text
    assert "read your JokeBox and log shows" in asks
    reads = browser.get(authorize(browser, client_id, "v" * 50)).text
    assert "log shows" not in reads and "can't change or delete anything" in reads


@pytest.mark.parametrize("joke_field", [{}, {"jokes": []}])
def test_review_updates_manual_show_without_losing_its_details(
    engine: Engine, joke_field: dict[str, Any]
) -> None:
    browser, client, token, jokes = engine
    target = str(uuid.uuid4())
    topic = browser.post("/api/topics", json={"name": "Fake Fridges"}).json()["id"]
    manual = {
        "performed_at": "2026-11-18T21:30:00+05:30",
        "venue_name": "Fake Hall",
        "audience_size": 17,
        "topic_ids": [topic],
        "notes": "Fake remarks",
        "learned": "Fake lesson",
        "jokes": [{"joke_id": jokes[0], "result": "killed", "note": "Fake pause"}],
    }
    original = browser.put(f"/api/logs/{target}", json=manual).json()
    listed = call(client, token, "list_shows", since="2026-11-18", until="2026-11-18")
    (entry,) = listed["structuredContent"]["shows"]
    assert entry["show_id"] == target and entry["reviewed_by"] is None
    review = show(jokes, show_id=entry["show_id"], venue="Unidentified Venue", audience_size=0)
    del review["jokes"]
    for _ in range(2):
        saved = call(client, token, "log_show", **(review | joke_field))["structuredContent"]
        assert saved["show_id"] == target and saved["events_kept"] == 3
    (updated,) = browser.get("/api/logs").json()
    for key in ("venue_name", "audience_size", "topic_ids", "notes", "learned", "jokes"):
        assert updated[key] == original[key]
    assert updated["review"]["events"][0]["joke_id"] == jokes[0]
    assert updated["laughs"] == review["laughs"] and updated["rating"] == review["rating"]


def test_missing_or_unowned_show_id_cannot_be_used_as_an_update_target(engine: Engine) -> None:
    browser, client, token, jokes = engine
    other = signed_in("other@example.com")
    target = str(uuid.uuid4())
    assert other.put(f"/api/logs/{target}", json={"performed_at": "2026-11-18T21:30:00"}).is_success
    for invalid in (target, str(uuid.uuid4())):
        result = call(client, token, "log_show", **show(jokes, show_id=invalid))
        assert result["isError"] and "not found" in result["content"][0]["text"]
    assert browser.get("/api/logs").json() == []
    assert other.get("/api/logs").json()[0]["review"] is None
