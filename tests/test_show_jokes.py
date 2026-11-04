"""A logged show records which jokes were done, in order, and how each went. Made-up material."""

import uuid
from typing import Any

from fastapi.testclient import TestClient

from tests.test_jokes import put_joke

NOW = "2026-10-01T20:30:00+05:30"


def put_log(client: TestClient, log_id: str, **fields: Any) -> Any:
    body = {"venue_name": "Fake Mic Night", "performed_at": NOW, **fields}
    return client.put(f"/api/logs/{log_id}", json=body)


def done(joke_id: str, result: str | None = None, note: str = "") -> dict[str, Any]:
    """A joke as a show lists it."""
    return {"joke_id": joke_id, "result": result, "note": note}


def test_a_joke_can_carry_a_comment(alice: TestClient) -> None:
    joke = put_joke(alice).json()["id"]
    log_id = str(uuid.uuid4())
    sent = [{"joke_id": joke, "result": "bombed", "note": "  Rushed the tag  "}]
    assert put_log(alice, log_id, jokes=sent).json()["jokes"] == [
        done(joke, "bombed", "Rushed the tag")
    ]
    # A save from an app older than comments sends none: the comment stays.
    older = put_log(alice, log_id, jokes=[{"joke_id": joke, "result": "ok"}]).json()
    assert older["jokes"] == [done(joke, "ok", "Rushed the tag")]
    cleared = put_log(alice, log_id, jokes=[{"joke_id": joke, "result": "ok", "note": ""}])
    assert cleared.json()["jokes"] == [done(joke, "ok")]
    too_long = [{"joke_id": joke, "note": "x" * 2001}]
    assert put_log(alice, log_id, jokes=too_long).status_code == 422


def test_a_show_keeps_its_jokes_in_order_with_results(alice: TestClient) -> None:
    a, b, c = (put_joke(alice, setup=f"Fake setup {n}").json()["id"] for n in range(3))
    log_id = str(uuid.uuid4())
    sent = [
        {"joke_id": b, "result": "killed"},
        {"joke_id": a},
        {"joke_id": c, "result": "bombed"},
    ]
    saved = put_log(alice, log_id, jokes=sent).json()
    assert saved["jokes"] == [done(b, "killed"), done(a), done(c, "bombed")]
    # Re-rate and reorder: the same jokes, updated in place.
    again = [done(a, "ok"), done(b, "killed")]
    assert put_log(alice, log_id, jokes=again).json()["jokes"] == again
    assert alice.get("/api/logs").json()[0]["jokes"] == again


def test_a_save_without_jokes_leaves_them(alice: TestClient) -> None:
    """Saves queued on a phone by an older version don't send jokes: they mustn't wipe them."""
    joke = put_joke(alice).json()["id"]
    log_id = str(uuid.uuid4())
    put_log(alice, log_id, jokes=[{"joke_id": joke, "result": "ok"}])
    assert put_log(alice, log_id, rating=5).json()["jokes"] == [done(joke, "ok")]
    assert put_log(alice, log_id, jokes=[]).json()["jokes"] == []


def test_a_joke_appears_once(alice: TestClient) -> None:
    joke = put_joke(alice).json()["id"]
    sent = [{"joke_id": joke, "result": "ok"}, {"joke_id": joke, "result": "bombed"}]
    saved = put_log(alice, str(uuid.uuid4()), jokes=sent).json()
    assert saved["jokes"] == [done(joke, "ok")]


def test_only_your_own_jokes_and_known_results(alice: TestClient, bob: TestClient) -> None:
    """Another person's joke, or one erased for good while the save waited, is left out: a
    save queued offline mustn't fail for good over it."""
    bobs = put_joke(bob).json()["id"]
    mine = put_joke(alice).json()["id"]
    sent = [{"joke_id": bobs}, {"joke_id": str(uuid.uuid4())}, {"joke_id": mine}]
    saved = put_log(alice, str(uuid.uuid4()), jokes=sent).json()
    assert saved["jokes"] == [done(mine)]
    wrong = put_log(alice, str(uuid.uuid4()), jokes=[{"joke_id": mine, "result": "great"}])
    assert wrong.status_code == 422
    too_many = [{"joke_id": str(uuid.uuid4())} for _ in range(201)]
    assert put_log(alice, str(uuid.uuid4()), jokes=too_many).status_code == 422


def test_a_trashed_joke_is_hidden_and_keeps_its_place(alice: TestClient) -> None:
    a, b, c = (put_joke(alice, setup=f"Fake setup {n}").json()["id"] for n in range(3))
    log_id = str(uuid.uuid4())
    put_log(
        alice, log_id, jokes=[{"joke_id": a}, {"joke_id": b, "result": "killed"}, {"joke_id": c}]
    )
    alice.delete(f"/api/jokes/{b}")
    shown = alice.get("/api/logs").json()[0]["jokes"]
    assert [j["joke_id"] for j in shown] == [a, c]
    # The app sends what it shows; the trashed joke keeps its place and result for when it's back.
    put_log(alice, log_id, jokes=shown)
    trash = alice.get("/api/trash").json()
    joke = next(item for item in trash if item["id"] == b)
    alice.post(f"/api/trash/{joke['kind']}/{b}/restore")
    back = alice.get("/api/logs").json()[0]["jokes"]
    assert back == [done(a), done(b, "killed"), done(c)]


def test_erasing_a_joke_for_good_drops_it_from_shows(alice: TestClient) -> None:
    joke = put_joke(alice).json()["id"]
    put_log(alice, str(uuid.uuid4()), jokes=[{"joke_id": joke, "result": "ok"}])
    alice.delete(f"/api/jokes/{joke}")
    alice.delete("/api/trash")
    assert alice.get("/api/logs").json()[0]["jokes"] == []
