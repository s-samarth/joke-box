"""A joke's and a premise's Vibe (an option from the persona label field) and Generic: kept when
an older app leaves them out, and read by Claude by name. Made-up material."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.connector import library
from tests.conftest import random_topic_id, signed_in
from tests.test_connector_voice import user
from tests.test_jokes import put_joke


def test_a_new_joke_is_not_sure(alice: TestClient) -> None:
    assert put_joke(alice).json()["persona"] is None


def test_a_save_without_it_keeps_it_and_null_clears(alice: TestClient) -> None:
    """An app from before personas leaves the field out; that mustn't make the joke Not sure."""
    joke_id = str(uuid.uuid4())
    first = put_joke(alice, joke_id, persona="bakchod").json()
    assert first["persona"] == "bakchod"
    older = put_joke(alice, joke_id, punchline="Fake punch", base_version=first["version"]).json()
    assert older["persona"] == "bakchod"
    cleared = put_joke(alice, joke_id, persona=None, base_version=older["version"]).json()
    assert cleared["persona"] is None


def test_the_default_persona_field_is_dominant_persona_side(alice: TestClient) -> None:
    fields = alice.get("/api/set-fields").json()["fields"]
    persona = next(f for f in fields if f["role"] == "persona")
    assert persona["name"] == "Dominant persona side"
    assert [o["label"] for o in persona["options"]] == ["Riled up", "Bakchod", "Point prover"]


def test_claude_reads_it_by_name_and_a_deleted_option_is_not_sure(db: Session) -> None:
    dev = signed_in("dev@example.com")
    riled = put_joke(dev, persona="riled-up").json()
    unset = put_joke(dev).json()
    me = user(db, "dev@example.com")

    def personas() -> list[str]:
        found = library.get_jokes(db, me, [riled["id"], unset["id"]])["jokes"]
        return [j["vibe"] for j in found]

    assert personas() == ["Riled up", "Not sure"]
    fields = dev.get("/api/set-fields").json()
    for f in fields["fields"]:
        if f["role"] == "persona":
            f["options"] = [o for o in f["options"] if o["id"] != "riled-up"]
    assert dev.put("/api/set-fields", json=fields).status_code == 200
    db.expire_all()
    assert personas() == ["Not sure", "Not sure"]


def test_a_premise_has_a_vibe_too_kept_when_left_out(alice: TestClient, db: Session) -> None:
    premise_id = str(uuid.uuid4())
    body = {"topic_id": random_topic_id(alice), "take": "Fake take"}
    first = alice.put(f"/api/premises/{premise_id}", json=body | {"persona": "point-prover"})
    assert first.json()["persona"] == "point-prover"
    older = alice.put(f"/api/premises/{premise_id}", json=body | {"notes": "Fake why"}).json()
    assert older["persona"] == "point-prover"
    cleared = alice.put(f"/api/premises/{premise_id}", json=body | {"persona": None}).json()
    assert cleared["persona"] is None and cleared["version"] == older["version"] + 1


def test_claude_reads_a_premises_vibe_by_name(db: Session) -> None:
    dev = signed_in("dev@example.com")
    premise_id = str(uuid.uuid4())
    body = {"topic_id": random_topic_id(dev), "take": "Fake vibe take", "persona": "bakchod"}
    assert dev.put(f"/api/premises/{premise_id}", json=body).status_code == 200
    me = user(db, "dev@example.com")
    assert library.get_premise(db, me, premise_id)["vibe"] == "Bakchod"
    [listed] = library.list_premises(db, me, query="Fake vibe take")["premises"]
    assert listed["vibe"] == "Bakchod"


def test_generic_starts_unanswered_and_a_save_without_it_keeps_it(alice: TestClient) -> None:
    joke_id = str(uuid.uuid4())
    assert put_joke(alice, joke_id).json()["generic"] is None
    first = put_joke(alice, joke_id, generic=False).json()
    older = put_joke(alice, joke_id, punchline="Fake punch", base_version=first["version"]).json()
    assert older["generic"] is False
    premise_id = str(uuid.uuid4())
    body = {"topic_id": random_topic_id(alice), "take": "Fake take"}
    assert alice.put(f"/api/premises/{premise_id}", json=body).json()["generic"] is None
    alice.put(f"/api/premises/{premise_id}", json=body | {"generic": True})
    assert alice.put(f"/api/premises/{premise_id}", json=body).json()["generic"] is True
