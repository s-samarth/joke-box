"""Watchlist and analyses: ticking routines off, links, and privacy. Everything here is made up."""

import uuid

from fastapi.testclient import TestClient

ROUTINE = {"title": "Fake Routine", "comedian": "Fake Comic", "category": "Fake Category"}


def test_tick_a_routine_watched(alice: TestClient) -> None:
    item_id = str(uuid.uuid4())
    alice.put(f"/api/watchlist/{item_id}", json=ROUTINE)
    ticked = alice.put(f"/api/watchlist/{item_id}", json=ROUTINE | {"watched": True}).json()
    assert ticked["watched"] is True
    assert alice.get("/api/watchlist").json()[0]["watched"] is True


def test_links_must_be_web_addresses(alice: TestClient) -> None:
    bad = ROUTINE | {"url": "javascript:alert(1)"}
    assert alice.put(f"/api/watchlist/{uuid.uuid4()}", json=bad).status_code == 422
    body = {"title": "Fake set", "url": "data:text/html,hi"}
    assert alice.put(f"/api/analyses/{uuid.uuid4()}", json=body).status_code == 422
    assert alice.put(f"/api/analyses/{uuid.uuid4()}", json={"title": "  "}).status_code == 422


def test_write_and_edit_an_analysis(alice: TestClient) -> None:
    item_id, analysis_id = str(uuid.uuid4()), str(uuid.uuid4())
    alice.put(f"/api/watchlist/{item_id}", json=ROUTINE)
    body = {
        "title": "Fake Comic: Fake Routine",
        "url": "https://example.com/fake",
        "body": "Fake notes on the turn.",
        "watch_item_id": item_id,
    }
    saved = alice.put(f"/api/analyses/{analysis_id}", json=body).json()
    assert saved["watch_item_id"] == item_id
    edited = alice.put(f"/api/analyses/{analysis_id}", json=body | {"body": "Fake rewrite"}).json()
    assert edited["body"] == "Fake rewrite"
    # Deleting the routine keeps the analysis, just unlinked.
    alice.delete(f"/api/watchlist/{item_id}")
    assert alice.get("/api/analyses").json()[0]["watch_item_id"] == item_id  # back on restore
    alice.delete(f"/api/trash/watchlist/{item_id}")
    assert alice.get("/api/analyses").json()[0]["watch_item_id"] is None
    assert alice.delete(f"/api/analyses/{analysis_id}").status_code == 204
    assert alice.get("/api/analyses").json() == []


def test_other_users_cannot_see_or_change(alice: TestClient, bob: TestClient) -> None:
    item_id, analysis_id = str(uuid.uuid4()), str(uuid.uuid4())
    alice.put(f"/api/watchlist/{item_id}", json=ROUTINE)
    alice.put(f"/api/analyses/{analysis_id}", json={"title": "Fake set"})
    assert bob.get("/api/watchlist").json() == []
    assert bob.get("/api/analyses").json() == []
    assert bob.put(f"/api/watchlist/{item_id}", json=ROUTINE).status_code == 404
    assert bob.delete(f"/api/analyses/{analysis_id}").status_code == 404
    # Bob can't attach his analysis to Alice's routine either.
    linked = {"title": "Fake", "watch_item_id": item_id}
    assert bob.put(f"/api/analyses/{uuid.uuid4()}", json=linked).status_code == 404
