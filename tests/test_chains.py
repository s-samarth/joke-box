"""A joke can follow another; many can follow one, and a chain can't loop."""

from fastapi.testclient import TestClient

from tests.test_jokes import put_joke


def follows(client: TestClient) -> dict[str, str | None]:
    return {b["setup"]: b["follows_id"] for b in client.get("/api/jokes").json()}


def test_many_jokes_can_follow_one(alice: TestClient) -> None:
    first = put_joke(alice, setup="Fake first").json()
    put_joke(alice, setup="Fake second", follows_id=first["id"])
    put_joke(alice, setup="Fake branch", follows_id=first["id"])
    assert follows(alice) == {
        "Fake first": None,
        "Fake second": first["id"],
        "Fake branch": first["id"],
    }


def test_a_chain_cannot_loop(alice: TestClient) -> None:
    a = put_joke(alice, setup="Fake A").json()
    b = put_joke(alice, setup="Fake B", follows_id=a["id"]).json()
    assert put_joke(alice, a["id"], setup="Fake A", follows_id=a["id"]).status_code == 422
    assert put_joke(alice, a["id"], setup="Fake A", follows_id=b["id"]).status_code == 422


def test_an_older_app_leaves_the_link_alone(alice: TestClient) -> None:
    a = put_joke(alice, setup="Fake A").json()
    b = put_joke(alice, setup="Fake B", follows_id=a["id"]).json()
    put_joke(alice, b["id"], setup="Fake B edited")
    assert follows(alice)["Fake B edited"] == a["id"]
    put_joke(alice, b["id"], setup="Fake B edited", follows_id=None)
    assert follows(alice)["Fake B edited"] is None


def test_cannot_follow_someone_elses_joke(alice: TestClient, bob: TestClient) -> None:
    theirs = put_joke(bob).json()
    assert put_joke(alice, follows_id=theirs["id"]).status_code == 422


def test_link_survives_the_trash_and_clears_when_erased(alice: TestClient) -> None:
    a = put_joke(alice, setup="Fake A").json()
    b = put_joke(alice, setup="Fake B", follows_id=a["id"]).json()
    alice.delete(f"/api/jokes/{a['id']}")
    put_joke(alice, b["id"], setup="Fake B", follows_id=a["id"], base_version=b["version"])
    assert follows(alice) == {"Fake B": a["id"]}
    assert alice.delete(f"/api/trash/jokes/{a['id']}").status_code == 204
    assert follows(alice) == {"Fake B": None}
