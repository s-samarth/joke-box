"""The connector reaches everything: every show (by date and page), jokes by hashtag and
subtopic, and Rewrites as well as Brainstorms. Everything here is made up."""

import json
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.connector import brainstorm, library, notebook, performing
from app.models import User
from tests.conftest import signed_in
from tests.test_jokes import put_joke
from tests.test_premises import new_topic


@pytest.fixture
def dev() -> TestClient:
    return signed_in("dev@example.com")


def me(db: Session) -> User:
    user = db.scalar(select(User).where(User.email == "dev@example.com"))
    assert user is not None
    return user


def log_show(client: TestClient, when: str, laughs: list[int] | None = None) -> None:
    show = {
        "venue_name": "Fake venue",
        "performed_at": when,
        "duration_seconds": 300,
        "laughs": laughs,
        "notes": "Fake notes",
    }
    assert client.put(f"/api/logs/{uuid.uuid4()}", json=show).status_code == 200


def test_every_show_can_be_reached_a_page_at_a_time(dev: TestClient, db: Session) -> None:
    for day in range(1, 31):
        log_show(dev, f"2026-09-{day:02d}T20:00:00+05:30")
    first = performing.list_shows(db, me(db))
    assert (first["total"], len(first["shows"]), first["next_offset"]) == (30, 25, 25)
    rest = performing.list_shows(db, me(db), offset=first["next_offset"])
    assert len(rest["shows"]) == 5 and rest["next_offset"] is None
    seen = [s["date"] for s in first["shows"] + rest["shows"]]
    assert len(set(seen)) == 30 and seen[0] == "2026-09-30" and seen[-1] == "2026-09-01"


def test_shows_by_date_count_lpm_across_the_range(dev: TestClient, db: Session) -> None:
    log_show(dev, "2026-09-30T23:30:00+05:30", laughs=[0, 0, 10, 0, 0])  # 18:00 UTC, 30 Sep IST
    log_show(dev, "2026-10-01T00:30:00+05:30", laughs=[0, 0, 0, 0, 10])  # 30 Sep UTC, 1 Oct IST
    log_show(dev, "2026-10-15T20:00:00+05:30", laughs=[10, 0, 0, 0, 0])
    october = performing.list_shows(db, me(db), since="2026-10-01", until="2026-10-31", limit=1)
    assert october["total"] == 2  # the dates are IST, as the app shows them
    assert [s["date"] for s in october["shows"]] == ["2026-10-15"]
    assert october["average_lpm"] == 6.0  # (50 + 10) points over 10 minutes, both shows
    assert october["shows_with_laughs_counted"] == 2
    only = performing.list_shows(db, me(db), until="2026-09-30")
    assert [s["date"] for s in only["shows"]] == ["2026-09-30"]
    with pytest.raises(ValueError, match="since must be a date"):
        performing.list_shows(db, me(db), since="last week")


def test_jokes_by_hashtag_and_subtopic(dev: TestClient, db: Session) -> None:
    topic = new_topic(dev, "Fake travel")
    sub = dev.post(f"/api/topics/{topic}/subtopics", json={"name": "Fake trains"}).json()
    put_joke(dev, setup="Fake platform", topic_id=topic, subtopic_id=sub["id"])
    put_joke(dev, setup="Fake airport", topic_id=topic, hashtags=["#fakeclosers", "fakegate"])
    tagged = library.search_jokes(db, me(db), query="#fakeclosers")
    assert [j["setup"] for j in tagged["jokes"]] == ["Fake airport"]
    for query in ("#fakegate", "fakegate"):  # saved without its #, found either way
        assert library.search_jokes(db, me(db), query=query)["total"] == 1
    trains = library.search_jokes(db, me(db), subtopic="fake TRAINS")
    assert [j["setup"] for j in trains["jokes"]] == ["Fake platform"]
    assert library.search_jokes(db, me(db), subtopic="Fake planes")["total"] == 0


def test_rewrites_sort_with_brainstorms_and_open(dev: TestClient, db: Session) -> None:
    joke = put_joke(dev, setup="Fake reworked joke").json()
    for title in ("Fake older", "Fake newer"):
        dev.put(f"/api/sessions/{uuid.uuid4()}", json={"title": title, "content": "Fake"})
    rewrite_id = str(uuid.uuid4())
    body = {"joke_id": joke["id"], "title": "Fake rewrite", "content": "Fake second draft"}
    assert dev.put(f"/api/brainstorms/{rewrite_id}", json=body).status_code == 200
    newest = notebook.search_brainstorms(db, me(db), limit=1)
    assert newest["total"] == 3
    assert [r["id"] for r in newest["results"]] == [rewrite_id]  # not after every session

    [block] = brainstorm.get_brainstorm(db, me(db), rewrite_id)
    opened = json.loads(block.text)  # type: ignore[union-attr]
    assert opened["kind"] == "rewrite" and opened["text"] == "Fake second draft"
    assert opened["joke_id"] == joke["id"] and opened["joke_setup"] == "Fake reworked joke"


def test_someone_elses_rewrite_stays_hidden(dev: TestClient, db: Session) -> None:
    alice = signed_in("alice@example.com")
    joke = put_joke(alice, setup="Fake alice joke").json()
    rewrite_id = str(uuid.uuid4())
    alice.put(f"/api/brainstorms/{rewrite_id}", json={"joke_id": joke["id"], "content": "Fake"})
    with pytest.raises(ValueError, match="No brainstorm"):
        brainstorm.get_brainstorm(db, me(db), rewrite_id)
