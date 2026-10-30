"""The connector's read-only tools: what they find, and that they only ever see your own rows.
Everything here is made up."""

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.connector import library, notebook, performing, study
from app.models import User
from tests.conftest import signed_in
from tests.test_craft import note_in
from tests.test_jokes import put_joke
from tests.test_premises import new_topic, put_premise


@pytest.fixture
def dev() -> TestClient:
    return signed_in("dev@example.com")


def account(db: Session, email: str) -> User:
    user = db.scalar(select(User).where(User.email == email))
    assert user is not None
    return user


def test_search_finds_words_anywhere_and_filters(dev: TestClient, db: Session) -> None:
    put_joke(dev, setup="Fake lift mirror", punchline="Fake reveal", strength=5)
    put_joke(dev, setup="Fake gym", tag_lines=["fake mirror tag"], strength=2)
    me = account(db, "dev@example.com")
    found = library.search_jokes(db, me, query="MIRROR")
    assert found["total"] == 2
    strong = library.search_jokes(db, me, query="mirror", min_strength=4)
    assert [j["setup"] for j in strong["jokes"]] == ["Fake lift mirror"]
    assert strong["jokes"][0]["topic"] == "Thoughts"


def test_other_users_and_the_trash_stay_hidden(dev: TestClient, db: Session) -> None:
    alice = signed_in("alice@example.com")
    theirs = put_joke(alice, setup="Fake private joke").json()
    gone = put_joke(dev, setup="Fake binned joke").json()
    dev.delete(f"/api/jokes/{gone['id']}")
    me = account(db, "dev@example.com")
    assert library.search_jokes(db, me)["total"] == 0
    looked_up = library.get_jokes(db, me, [theirs["id"], gone["id"]])
    assert looked_up["jokes"] == []
    assert sorted(looked_up["not_found"]) == sorted([theirs["id"], gone["id"]])


def test_a_premise_lists_its_jokes_in_chain_order(dev: TestClient, db: Session) -> None:
    premise = put_premise(dev, new_topic(dev, "Fake weddings"), take="Fake take").json()
    first = put_joke(dev, setup="Fake first", premise_id=premise["id"]).json()
    put_joke(dev, setup="Fake loner", premise_id=premise["id"])
    put_joke(dev, setup="Fake second", premise_id=premise["id"], follows_id=first["id"])
    me = account(db, "dev@example.com")
    opened = library.get_premise(db, me, premise["id"])
    assert [j["setup"] for j in opened["jokes"]] == ["Fake first", "Fake second", "Fake loner"]
    listed = library.list_premises(db, me, topic="fake weddings")["premises"]
    assert [(p["take"], p["jokes"]) for p in listed] == [("Fake take", 3)]
    with pytest.raises(ValueError):
        library.get_premise(db, me, str(uuid.uuid4()))


def test_a_joke_in_full(dev: TestClient, db: Session) -> None:
    first = put_joke(dev, setup="Fake first").json()
    second = put_joke(dev, setup="Fake second", follows_id=first["id"], comments="Fake note").json()
    dev.put(
        f"/api/setlists/{uuid.uuid4()}",
        json={
            "name": "Fake set",
            "items": [
                {"joke_id": first["id"]},
                {"joke_id": second["id"]},
            ],
        },
    )
    me = account(db, "dev@example.com")
    [full] = library.get_jokes(db, me, [second["id"]])["jokes"]
    assert full["follows"]["setup"] == "Fake first"
    assert full["notes"] == "Fake note"
    assert full["in_sets"] == [
        {"set_id": full["in_sets"][0]["set_id"], "set": "Fake set", "place": 2, "of": 2}
    ]


def test_a_set_in_running_order(dev: TestClient, db: Session) -> None:
    topic = new_topic(dev, "Fake doctors")
    a = put_joke(dev, setup="Fake opener", duration_seconds=60).json()
    b = put_joke(dev, setup="Fake middle", duration_seconds=30, topic_id=topic).json()
    c = put_joke(dev, setup="Fake closer", duration_seconds=45).json()
    set_id = str(uuid.uuid4())
    items = [{"joke_id": a["id"]}, {"joke_id": b["id"], "optional": True}, {"joke_id": c["id"]}]
    dev.put(f"/api/setlists/{set_id}", json={"name": "Fake set", "items": items})
    me = account(db, "dev@example.com")
    opened = performing.get_set(db, me, set_id)
    assert [i["role"] for i in opened["running_order"]] == ["opener", None, "closer"]
    assert opened["runtime_seconds"] == 105  # the optional joke doesn't count
    assert opened["topics"] == {"Thoughts": 2, "Fake doctors": 1}
    assert performing.list_sets(db, me)["sets"][0]["jokes"] == 3


def test_shows_with_lpm(dev: TestClient, db: Session) -> None:
    show = {
        "venue_name": "Fake venue",
        "performed_at": "2026-10-01T20:30:00+05:30",
        "duration_seconds": 300,
        "rating": 4,
        "laughs": [0, 0, 10, 0, 0],
        "notes": "Fake notes",
    }
    dev.put(f"/api/logs/{uuid.uuid4()}", json=show)
    dev.put(f"/api/logs/{uuid.uuid4()}", json=show | {"laughs": None, "notes": "Fake other"})
    me = account(db, "dev@example.com")
    shows = performing.list_shows(db, me)
    assert shows["average_lpm"] == 6.0  # 30 points over 5 minutes, the uncounted one left out
    assert [s["lpm"] for s in shows["shows"]] == [6.0, None]
    assert shows["shows"][0]["date"] == "2026-10-01"
    assert performing.list_shows(db, me, query="other")["total"] == 1


def test_notebook_and_study(dev: TestClient, db: Session) -> None:
    dev.put(f"/api/observations/{uuid.uuid4()}", json={"text": "Fake noticed thing"})
    dev.put(f"/api/sessions/{uuid.uuid4()}", json={"title": "Fake session", "content": "Fake page"})
    note_id = str(uuid.uuid4())
    dev.put(f"/api/craft-notes/{note_id}", json=note_in(dev) | {"title": "Fake rule"})
    dev.put(f"/api/analyses/{uuid.uuid4()}", json={"title": "Fake analysis", "body": "Fake why"})
    me = account(db, "dev@example.com")
    assert notebook.search_observations(db, me, "noticed")["total"] == 1
    assert notebook.search_brainstorms(db, me, "page")["results"][0]["kind"] == "brainstorm"
    titles = [n["title"] for n in study.search_craft(db, me)["notes"]]
    assert "Fake rule" in titles
    assert study.get_craft_notes(db, me, [note_id])["notes"][0]["title"] == "Fake rule"
    [analysis] = study.search_analyses(db, me, "why")["analyses"]
    assert study.get_analysis(db, me, analysis["id"])["body"] == "Fake why"


def test_the_overview_counts(dev: TestClient, db: Session) -> None:
    topic = new_topic(dev, "Fake topic")
    put_joke(dev, topic_id=topic)
    put_premise(dev, topic)
    me = account(db, "dev@example.com")
    seen = library.overview(db, me)
    assert seen["jokes"] == 1 and seen["premises"] == 1
    assert {"name": "Fake topic", "jokes": 1, "subtopics": []} in seen["topics"]


def test_a_bad_id_is_a_clear_error(db: Session, dev: TestClient) -> None:
    with pytest.raises(ValueError, match="isn't a JokeBox id"):
        library.get_jokes(db, account(db, "dev@example.com"), ["not-an-id"])
