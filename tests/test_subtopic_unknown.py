"""Every topic's default subtopic, "Subtopic unknown": where a joke with no subtopic goes."""

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Subtopic, Topic, User
from app.services.subtopics import unknown_for
from tests.conftest import random_topic_id
from tests.test_jokes import put_joke
from tests.test_topics import unknown_of


def new_topic(client: TestClient, name: str) -> str:
    return str(client.post("/api/topics", json={"name": name}).json()["id"])


def test_a_new_topic_starts_with_it_and_random_has_it(alice: TestClient) -> None:
    topic = new_topic(alice, "Fake topic")
    [found] = [t for t in alice.get("/api/topics").json() if t["id"] == topic]
    assert [(s["name"], s["is_system"]) for s in found["subtopics"]] == [("Subtopic unknown", True)]
    assert unknown_of(alice, random_topic_id(alice))


def test_a_joke_with_no_subtopic_goes_there(alice: TestClient) -> None:
    topic = new_topic(alice, "Fake topic")
    joke = put_joke(alice, topic_id=topic).json()
    assert joke["subtopic_id"] == unknown_of(alice, topic)
    picked = alice.post(f"/api/topics/{topic}/subtopics", json={"name": "Fake sub"}).json()
    assert (
        put_joke(alice, topic_id=topic, subtopic_id=picked["id"]).json()["subtopic_id"]
        == (picked["id"])
    )
    # Moving a joke to another topic without a subtopic lands it in that topic's default.
    other = new_topic(alice, "Fake other")
    moved = put_joke(alice, joke["id"], topic_id=other).json()
    assert moved["subtopic_id"] == unknown_of(alice, other)


def test_it_cannot_be_renamed_or_deleted(alice: TestClient) -> None:
    default = unknown_of(alice, new_topic(alice, "Fake topic"))
    assert alice.patch(f"/api/subtopics/{default}", json={"name": "Fake"}).status_code == 400
    assert alice.delete(f"/api/subtopics/{default}").status_code == 400


def test_one_made_by_hand_becomes_the_default(db: Session, alice: TestClient) -> None:
    topic_id = new_topic(alice, "Fake topic")
    user = db.scalar(select(User).where(User.email == "alice@example.com"))
    topic = db.scalar(select(Topic).where(Topic.name == "Fake topic"))
    assert user is not None and topic is not None
    db.execute(Subtopic.__table__.delete().where(Subtopic.topic_id == topic.id))
    hand = Subtopic(user_id=user.id, topic_id=topic.id, name="subtopic UNKNOWN")
    db.add(hand)
    db.commit()
    assert unknown_for(db, user, topic).id == hand.id
    db.commit()
    assert unknown_of(alice, topic_id) == str(hand.id)
