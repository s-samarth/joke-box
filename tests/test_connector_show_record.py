"""Claude sees which jokes were done at each show and how each joke has gone across shows.
Everything here is made up."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.connector import library, performing
from app.models import User
from tests.conftest import signed_in
from tests.test_jokes import put_joke


@pytest.fixture
def dev() -> TestClient:
    return signed_in("dev@example.com")


def me(db: Session) -> User:
    user = db.scalar(select(User).where(User.email == "dev@example.com"))
    assert user is not None
    return user


def log(client: TestClient, when: str, jokes: list[dict[str, str]]) -> str:
    log_id = str(uuid.uuid4())
    show = {"venue_name": "Fake venue", "performed_at": when, "jokes": jokes}
    assert client.put(f"/api/logs/{log_id}", json=show).status_code == 200
    return log_id


def test_shows_list_their_jokes_and_jokes_their_record(dev: TestClient, db: Session) -> None:
    a = put_joke(dev, setup="Fake opener about a fridge").json()["id"]
    b = put_joke(dev, setup="Fake closer about a kettle").json()["id"]
    log(dev, "2026-09-01T20:00:00+05:30", [{"joke_id": a, "result": "bombed"}, {"joke_id": b}])
    log(dev, "2026-10-01T20:00:00+05:30", [{"joke_id": a, "result": "killed"}])
    shows = performing.list_shows(db, me(db))["shows"]
    assert shows[0]["jokes"] == [
        {"id": a, "setup": "Fake opener about a fridge", "result": "killed", "note": ""}
    ]
    assert [j["id"] for j in shows[1]["jokes"]] == [a, b]
    jokes = {j["id"]: j for j in library.get_jokes(db, me(db), [a, b])["jokes"]}
    assert jokes[a]["shows"] == {
        "shows_done": 2,
        "killed": 1,
        "ok": 0,
        "bombed": 1,
        "last_done": "2026-10-01",
    }
    assert jokes[b]["shows"]["shows_done"] == 1


def test_a_joke_never_done_and_trashed_ones(dev: TestClient, db: Session) -> None:
    a = put_joke(dev).json()["id"]
    b = put_joke(dev).json()["id"]
    show = log(dev, "2026-10-01T20:00:00+05:30", [{"joke_id": a, "result": "ok"}, {"joke_id": b}])
    assert library.get_jokes(db, me(db), [b])["jokes"][0]["shows"]["shows_done"] == 1
    dev.delete(f"/api/jokes/{b}")
    assert [j["id"] for j in performing.list_shows(db, me(db))["shows"][0]["jokes"]] == [a]
    dev.delete(f"/api/logs/{show}")  # a trashed show no longer counts
    record = library.get_jokes(db, me(db), [a])["jokes"][0]["shows"]
    assert record == {"shows_done": 0, "killed": 0, "ok": 0, "bombed": 0, "last_done": None}
