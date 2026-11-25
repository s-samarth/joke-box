"""A set's status: the premises' four, Draft to start, kept when an older app leaves it out."""

import uuid

from fastapi.testclient import TestClient


def test_a_new_set_is_a_draft_and_keeps_its_status(alice: TestClient) -> None:
    set_id = str(uuid.uuid4())
    url = f"/api/setlists/{set_id}"
    assert alice.put(url, json={"name": "Fake set"}).json()["status"] == "Draft"
    assert alice.put(url, json={"name": "Fake set", "status": "Stage Ready"}).json()["status"] == (
        "Stage Ready"
    )
    # An older app sends no status: the set keeps the one it has.
    assert alice.put(url, json={"name": "Fake set again"}).json()["status"] == "Stage Ready"
    listed = {s["id"]: s for s in alice.get("/api/setlists").json()}
    assert listed[set_id]["status"] == "Stage Ready"


def test_an_unknown_status_is_refused(alice: TestClient) -> None:
    sent = {"name": "Fake set", "status": "Finished"}
    assert alice.put(f"/api/setlists/{uuid.uuid4()}", json=sent).status_code == 422


def test_changing_only_the_status_is_a_change(alice: TestClient) -> None:
    url = f"/api/setlists/{uuid.uuid4()}"
    first = alice.put(url, json={"name": "Fake set"}).json()
    sent = {"name": "Fake set", "status": "Discarded", "base_version": first["version"]}
    assert alice.put(url, json=sent).json()["version"] == first["version"] + 1
