"""Sets: a rating, your own tags, and optional jokes."""

import uuid

from fastapi.testclient import TestClient

from tests.test_trash import joke


def save_set(client: TestClient, set_id: str, **fields: object) -> dict:  # type: ignore[type-arg]
    response = client.put(f"/api/setlists/{set_id}", json={"name": "Fake set", **fields})
    assert response.status_code == 200, response.text
    return response.json()


def test_new_users_get_the_starting_tags(alice: TestClient) -> None:
    names = [t["name"] for t in alice.get("/api/set-tags").json()]
    assert names[:2] == ["In progress", "Weak"] and "One-liners" in names and len(names) == 8


def test_rate_a_set_and_clear_it(alice: TestClient) -> None:
    set_id = str(uuid.uuid4())
    assert save_set(alice, set_id)["rating"] is None
    assert save_set(alice, set_id, rating=4)["rating"] == 4
    assert save_set(alice, set_id, rating=None)["rating"] is None
    assert alice.put(f"/api/setlists/{set_id}", json={"rating": 6}).status_code == 422


def test_tag_a_set_and_manage_tags(alice: TestClient, bob: TestClient) -> None:
    weak = next(t["id"] for t in alice.get("/api/set-tags").json() if t["name"] == "Weak")
    mine = alice.post("/api/set-tags", json={"name": "Fake tag"})
    assert mine.status_code == 201
    assert alice.get("/api/set-tags").json()[-1]["name"] == "Fake tag"  # new ones go last
    assert alice.post("/api/set-tags", json={"name": "fake TAG"}).status_code == 409
    set_id = str(uuid.uuid4())
    assert save_set(alice, set_id, tag_ids=[weak, mine.json()["id"]])["tag_ids"] == [
        weak,
        mine.json()["id"],
    ]
    renamed = alice.patch(f"/api/set-tags/{weak}", json={"name": "Shaky"})
    assert renamed.json()["name"] == "Shaky"
    # Deleting a tag takes it off the set; the set stays.
    assert alice.delete(f"/api/set-tags/{weak}").status_code == 204
    assert alice.get("/api/setlists").json()[0]["tag_ids"] == [mine.json()["id"]]
    # A save still listing the deleted tag (it waited offline) saves without it.
    stale = save_set(alice, set_id, tag_ids=[weak, mine.json()["id"]])
    assert stale["tag_ids"] == [mine.json()["id"]]
    # Bob can't use, rename or delete Alice's tags.
    bob_set = f"/api/setlists/{uuid.uuid4()}"
    assert bob.put(bob_set, json={"tag_ids": [mine.json()["id"]]}).json()["tag_ids"] == []
    assert bob.patch(f"/api/set-tags/{mine.json()['id']}", json={"name": "x"}).status_code == 404
    assert bob.delete(f"/api/set-tags/{mine.json()['id']}").status_code == 404


def test_optional_jokes_are_kept_even_while_in_the_trash(alice: TestClient) -> None:
    sure, maybe = joke(alice), joke(alice)
    set_id = str(uuid.uuid4())
    items = [{"bit_id": sure}, {"bit_id": maybe, "optional": True}]
    saved = save_set(alice, set_id, items=items)
    assert [i["optional"] for i in saved["items"]] == [False, True]
    alice.delete(f"/api/bits/{maybe}")
    save_set(alice, set_id, items=[{"bit_id": sure}])  # the app's save, without the trashed one
    alice.post(f"/api/trash/jokes/{maybe}/restore")
    back = alice.get("/api/setlists").json()[0]["items"]
    assert [(i["bit_id"], i["optional"]) for i in back] == [(sure, False), (maybe, True)]
