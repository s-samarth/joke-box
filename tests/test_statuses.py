"""Joke statuses: Draft is the protected default; rename, merge, delete and arrange the rest."""

import uuid
from typing import Any

from fastapi.testclient import TestClient

from tests.test_jokes import put_joke


def statuses(client: TestClient) -> list[dict[str, Any]]:
    return client.get("/api/statuses").json()  # type: ignore[no-any-return]


def status_id(client: TestClient, name: str) -> str:
    return next(s["id"] for s in statuses(client) if s["name"] == name)


def joke(client: TestClient, joke_id: str) -> dict[str, Any]:
    return client.get(f"/api/jokes/{joke_id}").json()  # type: ignore[no-any-return]


def test_a_joke_saved_with_no_status_is_a_draft(alice: TestClient) -> None:
    assert put_joke(alice, status=None).json()["status"] == "Draft"
    assert statuses(alice)[0]["name"] == "Draft"


def test_draft_cannot_be_renamed_or_deleted(alice: TestClient) -> None:
    draft = status_id(alice, "Draft")
    assert alice.patch(f"/api/statuses/{draft}", json={"name": "Rough"}).status_code == 400
    assert alice.delete(f"/api/statuses/{draft}").status_code == 400


def test_rename_moves_every_joke_and_leaves_updated_at(alice: TestClient) -> None:
    made = put_joke(alice, status="Testing").json()
    sid = status_id(alice, "Testing")
    assert alice.patch(f"/api/statuses/{sid}", json={"name": "Trying out"}).status_code == 204
    after = joke(alice, made["id"])
    assert (after["status"], after["updated_at"]) == ("Trying out", made["updated_at"])


def test_rename_onto_an_existing_status_merges(alice: TestClient) -> None:
    a = put_joke(alice, status="Ready").json()
    b = put_joke(alice, status="Stage Ready").json()
    alice.patch(f"/api/statuses/{status_id(alice, 'Ready')}", json={"name": "stage ready"})
    names = [s["name"] for s in statuses(alice)]
    assert "Ready" not in names and names.count("Stage Ready") == 1
    assert joke(alice, a["id"])["status"] == joke(alice, b["id"])["status"] == "Stage Ready"


def test_delete_sends_its_jokes_to_draft_even_in_the_trash(alice: TestClient) -> None:
    live = put_joke(alice, status="Discarded").json()
    binned = put_joke(alice, status="Discarded").json()
    alice.delete(f"/api/jokes/{binned['id']}")
    assert alice.delete(f"/api/statuses/{status_id(alice, 'Discarded')}").status_code == 204
    assert "Discarded" not in [s["name"] for s in statuses(alice)]
    assert joke(alice, live["id"])["status"] == "Draft"
    alice.post(f"/api/trash/jokes/{binned['id']}/restore")
    assert joke(alice, binned["id"])["status"] == "Draft"


def test_arrange_keeps_draft_first(alice: TestClient) -> None:
    for name in ("Testing", "Discarded"):
        put_joke(alice, status=name)
    ids = {s["name"]: s["id"] for s in statuses(alice)}
    order = [ids["Discarded"], ids["Draft"], ids["Testing"]]
    assert alice.put("/api/statuses/order", json={"ids": order}).status_code == 204
    names = [s["name"] for s in statuses(alice)]
    assert names[:2] == ["Draft", "Discarded"]
    assert names.index("Discarded") < names.index("Testing")


def test_other_users_cannot_edit_my_statuses(alice: TestClient, bob: TestClient) -> None:
    put_joke(alice, status="Testing")
    sid = status_id(alice, "Testing")
    assert bob.patch(f"/api/statuses/{sid}", json={"name": "x"}).status_code == 404
    assert bob.delete(f"/api/statuses/{sid}").status_code == 404
    assert bob.patch(f"/api/statuses/{uuid.uuid4()}", json={"name": "x"}).status_code == 404
