"""log_show's topics and lesson: the comic's topics by name (else the jokes', else Random), and
what they learned saved as a Craft note linked to the show, updated when the show is logged
again. Everything here is made up."""

from typing import Any

from tests.connector_auth import call
from tests.test_connector_log_show import Engine, engine, show  # noqa: F401  (the fixture)


def topic_names(browser: Any, saved: dict[str, Any]) -> list[str]:
    names = {t["id"]: t["name"] for t in browser.get("/api/topics").json()}
    return [names[i] for i in saved["topic_ids"]]


def test_the_show_gets_the_topics_the_comic_named(engine: Engine) -> None:  # noqa: F811
    browser, client, token, jokes = engine
    browser.post("/api/topics", json={"name": "Fake Fridges"})
    out = call(client, token, "log_show", **show(jokes, topics=["fake fridges"]) | {"jokes": []})
    assert not out.get("isError"), out
    assert out["structuredContent"]["topics"] == ["Fake Fridges"]
    assert topic_names(browser, browser.get("/api/logs").json()[0]) == ["Fake Fridges"]


def test_a_topic_that_isnt_there_is_refused_with_the_list(engine: Engine) -> None:  # noqa: F811
    browser, client, token, jokes = engine
    out = call(client, token, "log_show", **show(jokes, topics=["Fake Kettles"]))
    text = out["content"][0]["text"]
    assert out["isError"] and "Fake Kettles" in text and "Random" in text
    assert browser.get("/api/logs").json() == []


def test_with_no_topic_and_no_jokes_the_show_goes_under_random(engine: Engine) -> None:  # noqa: F811
    browser, client, token, jokes = engine
    out = call(client, token, "log_show", **show(jokes) | {"jokes": []})
    assert out["structuredContent"]["topics"] == ["Random"]


def test_what_was_learned_becomes_one_linked_craft_note(engine: Engine) -> None:  # noqa: F811
    browser, client, token, jokes = engine
    learned = "Fake lesson: pause before the verdict\nMore about the fake lesson."
    first = call(client, token, "log_show", **show(jokes, learned=learned))["structuredContent"]
    assert first["lesson"] == "Fake lesson: pause before the verdict"
    again = show(jokes, show_id=first["show_id"], learned="Fake lesson, rewritten")
    assert call(client, token, "log_show", **again)["structuredContent"]["lesson"] == (
        "Fake lesson, rewritten"
    )
    notes = browser.get("/api/craft-notes").json()
    assert [(n["title"], n["performance_log_id"]) for n in notes] == [
        ("Fake lesson, rewritten", first["show_id"])
    ]
    assert notes[0]["source"].startswith("Show at Fake Cafe, 2026-11-18")


def test_logging_with_nothing_learned_keeps_the_lesson(engine: Engine) -> None:  # noqa: F811
    browser, client, token, jokes = engine
    first = call(client, token, "log_show", **show(jokes, learned="Fake keep"))["structuredContent"]
    out = call(client, token, "log_show", **show(jokes, show_id=first["show_id"]))
    assert out["structuredContent"]["lesson"] is None
    assert [n["title"] for n in browser.get("/api/craft-notes").json()] == ["Fake keep"]
