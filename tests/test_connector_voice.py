"""Claude can see voice notes: what each is called and tagged, never the audio. Made-up notes."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.connector import voice
from app.models import User
from tests.conftest import signed_in
from tests.test_voice_notes import new_note

FIELDS = {"id", "label", "hashtags", "seconds", "recorded", "uploaded", "joke_ids"}


def user(db: Session, email: str) -> User:
    found = db.scalar(select(User).where(User.email == email))
    assert found is not None
    return found


def test_voice_notes_by_label_and_hashtag(db: Session) -> None:
    dev = signed_in("dev@example.com")
    new_note(dev, label="Fake bus stop idea", hashtags=["#commute"], duration_seconds=30)
    new_note(dev, label="Fake lift rant", hashtags=["office"])
    me = user(db, "dev@example.com")

    everything = voice.search_voice_notes(db, me)
    assert everything["total"] == 2
    assert set(everything["voice_notes"][0]) == FIELDS
    assert everything["voice_notes"][0]["label"] == "Fake lift rant"  # newest first

    for query in ("bus idea", "#commute", "commute", "#office"):
        labels = [n["label"] for n in voice.search_voice_notes(db, me, query)["voice_notes"]]
        assert len(labels) == 1, query
    assert voice.search_voice_notes(db, me, "nothing like this")["total"] == 0


def test_only_your_own_and_not_the_trash(db: Session) -> None:
    dev, alice = signed_in("dev@example.com"), signed_in("alice@example.com")
    new_note(alice, label="Fake alice note")
    gone = new_note(dev, label="Fake deleted note")
    assert dev.delete(f"/api/voice-notes/{gone}").status_code == 204
    assert voice.search_voice_notes(db, user(db, "dev@example.com"))["total"] == 0
