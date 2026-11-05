"""Sets and brainstorm sessions edited on two devices: a save made from an older version that
would change something is refused (409), never written over the other device's edit."""

import uuid

from fastapi.testclient import TestClient

from tests.test_jokes import put_joke
from tests.test_sessions import STROKE, put_session
from tests.test_sessions_packed import unpacked


def put_set(client: TestClient, set_id: str, **fields: object):  # type: ignore[no-untyped-def]
    return client.put(f"/api/setlists/{set_id}", json={"name": "Fake set", **fields})


def test_set_versions_go_up_by_one_per_save(alice: TestClient) -> None:
    set_id = str(uuid.uuid4())
    assert put_set(alice, set_id).json()["version"] == 1
    assert put_set(alice, set_id, name="Renamed", base_version=1).json()["version"] == 2
    assert alice.get("/api/setlists").json()[0]["version"] == 2


def test_set_edited_on_another_device_is_refused(alice: TestClient) -> None:
    joke = put_joke(alice).json()
    set_id = str(uuid.uuid4())
    put_set(alice, set_id)
    phone = put_set(alice, set_id, items=[{"joke_id": joke["id"]}], base_version=1)
    assert phone.status_code == 200
    ipad = put_set(alice, set_id, name="iPad name", base_version=1)
    assert ipad.status_code == 409
    assert "another device" in ipad.json()["detail"]
    kept = alice.get("/api/setlists").json()[0]
    assert (kept["name"], [i["joke_id"] for i in kept["items"]]) == ("Fake set", [joke["id"]])


def test_set_retry_and_old_apps_are_not_clashes(alice: TestClient) -> None:
    set_id = str(uuid.uuid4())
    put_set(alice, set_id)
    put_set(alice, set_id, name="Same edit", base_version=1)
    # The answer was lost and the same edit is sent again from the same base: harmless.
    assert put_set(alice, set_id, name="Same edit", base_version=1).status_code == 200
    # A save waiting from before versions existed has no base, and goes through as before.
    assert put_set(alice, set_id, name="Old app").status_code == 200


def test_session_edited_on_another_device_is_refused(alice: TestClient) -> None:
    session_id = str(uuid.uuid4())
    assert put_session(alice, session_id).json()["version"] == 1
    phone = put_session(alice, session_id, content="Phone words", base_version=1)
    assert phone.json()["version"] == 2
    ipad = put_session(alice, session_id, ink=[STROKE], base_version=1)
    assert ipad.status_code == 409
    kept = unpacked(alice.get(f"/api/sessions/{session_id}"))
    assert (kept["content"], kept["ink"], kept["version"]) == ("Phone words", [], 2)


def test_session_retry_is_not_a_clash(alice: TestClient) -> None:
    session_id, joke_id = str(uuid.uuid4()), str(uuid.uuid4())
    put_session(alice, session_id)
    edit = {"ink": [STROKE], "joke_ids": [joke_id], "base_version": 1}
    assert put_session(alice, session_id, **edit).status_code == 200
    assert put_session(alice, session_id, **edit).status_code == 200
    assert put_session(alice, session_id, content="Old app, no base").status_code == 200
