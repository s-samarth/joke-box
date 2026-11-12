"""The Notes box on premises and observations: saved, kept when an older app leaves it out,
checked for clashes like the rest, and read by Claude. Made-up material only."""

import uuid

from fastapi.testclient import TestClient

from tests.test_observations import put_obs
from tests.test_premises import new_topic, put_premise


def test_a_premise_keeps_its_notes_apart_from_why_its_true(alice: TestClient) -> None:
    topic, pid = new_topic(alice, "Fake family"), str(uuid.uuid4())
    made = put_premise(alice, topic, pid, notes="Fake because").json()
    assert (made["extra_notes"], made["version"]) == ("", 1)
    saved = put_premise(alice, topic, pid, notes="Fake because", extra_notes="Fake aside")
    assert (saved.json()["extra_notes"], saved.json()["version"]) == ("Fake aside", 2)
    # An app from before Notes sends no extra_notes: what's stored stays, the version doesn't move.
    older = put_premise(alice, topic, pid, notes="Fake because", base_version=2).json()
    assert (older["extra_notes"], older["version"]) == ("Fake aside", 2)


def test_an_observation_gets_notes(alice: TestClient) -> None:
    oid = str(uuid.uuid4())
    assert put_obs(alice, oid).json()["extra_notes"] == ""
    assert put_obs(alice, oid, extra_notes="Fake more").json()["extra_notes"] == "Fake more"
    assert put_obs(alice, oid, text="Fake, reworded").json()["extra_notes"] == "Fake more"
    [listed] = alice.get("/api/observations").json()
    assert (listed["text"], listed["extra_notes"]) == ("Fake, reworded", "Fake more")


def test_notes_edited_from_an_older_version_clash(alice: TestClient) -> None:
    oid = str(uuid.uuid4())
    put_obs(alice, oid)
    assert put_obs(alice, oid, extra_notes="Fake one", base_version=1).status_code == 200
    assert put_obs(alice, oid, extra_notes="Fake two", base_version=1).status_code == 409


def test_notes_have_a_limit(alice: TestClient) -> None:
    too_long = "x" * 20_001
    assert put_obs(alice, extra_notes=too_long).status_code == 422
    assert put_premise(alice, new_topic(alice, "Fake"), extra_notes=too_long).status_code == 422
