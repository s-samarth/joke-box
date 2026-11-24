"""Show edits from a phone, a second browser and a recording review, on made-up entries."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.orm import Session

from tests.connector_auth import call
from tests.test_connector_log_show import Engine, engine, show  # noqa: F401
from tests.test_jokes import put_joke

SHOW = {"performed_at": "2026-10-02T20:00:00+05:30", "venue_name": "Fake Hall"}


def test_stale_show_cannot_overwrite_a_lesson_and_noop_retry_keeps_version(
    alice: TestClient,
) -> None:
    url = f"/api/logs/{uuid.uuid4()}"
    first = alice.put(url, json=SHOW).json()
    changed = SHOW | {"learned": "Fake pause", "base_version": first["version"]}
    second = alice.put(url, json=changed).json()
    assert second["version"] == first["version"] + 1
    assert alice.put(url, json=changed).json()["version"] == second["version"]
    stale = SHOW | {"learned": "", "duration_seconds": 301, "base_version": first["version"]}
    assert alice.put(url, json=stale).status_code == 409
    assert alice.get("/api/logs").json()[0]["learned"] == "Fake pause"
    old_client = alice.put(url, json=SHOW | {"duration_seconds": 250}).json()
    assert old_client["learned"] == "Fake pause" and old_client["version"] == second["version"] + 1


def test_child_only_edits_move_show_version(alice: TestClient) -> None:
    url = f"/api/logs/{uuid.uuid4()}"
    joke = put_joke(alice).json()["id"]
    first = alice.put(url, json=SHOW | {"jokes": [{"joke_id": joke}]}).json()
    changed = SHOW | {"jokes": [{"joke_id": joke, "result": "killed", "note": "Fake comment"}]}
    second = alice.put(url, json=changed | {"base_version": first["version"]}).json()
    assert second["version"] == first["version"] + 1
    assert alice.put(url, json=changed).json()["version"] == second["version"]


def test_review_changes_move_version_and_zero_counts_towards_average(engine: Engine) -> None:  # noqa: F811
    browser, client, token, jokes = engine
    body = show(jokes, laughs=[0] * 5, duration_seconds=300)
    logged = call(client, token, "log_show", **body)["structuredContent"]
    assert logged["lpm"] == 0
    (first,) = browser.get("/api/logs").json()
    again = body | {"events": [], "show_id": first["id"]}
    call(client, token, "log_show", **again)
    (updated,) = browser.get("/api/logs").json()
    assert updated["version"] == first["version"] + 1
    call(client, token, "log_show", **again)
    assert browser.get("/api/logs").json()[0]["version"] == updated["version"]
    assert (
        browser.put(
            f"/api/logs/{first['id']}", json=SHOW | {"base_version": first["version"]}
        ).status_code
        == 409
    )
    for tally in ([10, 0, 0, 0, 0], None):
        browser.put(
            f"/api/logs/{uuid.uuid4()}", json=SHOW | {"duration_seconds": 300, "laughs": tally}
        )
    stats = call(client, token, "list_shows")["structuredContent"]
    assert stats["average_lpm"] == 1 and stats["shows_with_laughs_counted"] == 2


def test_one_review_query_for_a_page_of_shows(alice: TestClient, db: Session) -> None:
    for _ in range(8):
        alice.put(f"/api/logs/{uuid.uuid4()}", json=SHOW)
    statements = []

    def record(conn, cursor, statement, params, context, executemany):
        if "FROM show_reviews" in statement:
            statements.append(statement)

    bind = db.get_bind()
    event.listen(bind, "before_cursor_execute", record)
    try:
        assert len(alice.get("/api/logs").json()) == 8
    finally:
        event.remove(bind, "before_cursor_execute", record)
    assert len(statements) == 1
