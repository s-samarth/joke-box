"""Importing old Bit Vault data: messy real-world shapes load cleanly."""

from sqlalchemy.orm import Session

from app.auth.bootstrap import upsert_user
from app.seed.convert import seconds, split_tags
from app.seed.loader import Loader


def test_helpers() -> None:
    assert seconds("2m 30s") == 150
    assert seconds(5) == 300
    assert seconds(None) == 0
    assert split_tags("Punch. Tags: first\nsecond") == ("Punch.", ["first", "second"])
    assert split_tags("No tags here") == ("No tags here", [])


def test_import_handles_orphans_and_tags(db: Session) -> None:
    user = upsert_user(db, email="comic@example.com", google_sub=None, name="", avatar="")
    data = {
        "topics": [{"name": "Random", "subtopics": []}, {"name": "Doctors", "subtopics": []}],
        "bits": [
            {
                "id": "b1",
                "setup": "Fake setup",
                "punchline": "Fake punch. Tags: fake tag",
                "type": ["One-liner", "English"],
                "topic": "Doctors",
                "status": "Complete",
                "rating": 4,
                "duration": "0m 08s",
                "createdAt": "2026-02-16T10:00:00Z",
            },
            {"id": "b2", "setup": "Another fake", "type": "One-liner", "topic": "Gone topic"},
        ],
        "brainstorms": [{"bitId": "deleted", "title": "This is BS", "content": "x"}],
        "logs": [
            {
                "venueName": "TCT",
                "date": "2026-02-12T20:00:00Z",
                "duration": "5m 00s",
                "audienceSize": 10,
                "rating": 3,
                "setTopics": ["Doctors"],
            }
        ],
        "setlists": [
            {
                "name": "Set",
                "targetDuration": "5m 00s",
                "bits": [
                    {"bitId": "b1", "order": 1, "duration": "0m 08s"},
                    {"bitId": "missing", "order": 2, "duration": "0m 10s"},
                ],
            }
        ],
    }
    loader = Loader(db, user)
    loader.run(data)
    db.commit()
    assert loader.report == {"topics": 2, "jokes": 2, "logs": 1, "setlists": 1}
    assert len(loader.skipped) == 2
    joke = loader.jokes["b1"]
    assert (joke.punchline, joke.tag_lines, joke.duration_seconds) == (
        "Fake punch.",
        ["fake tag"],
        8,
    )
    assert sorted(t.name for t in joke.types) == ["English", "One-liner"]
