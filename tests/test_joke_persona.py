"""A joke's persona: an option from the persona label field, kept when an older app leaves it
out, and read by Claude by its name. Made-up material."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.connector import library
from tests.conftest import signed_in
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
        return [j["persona"] for j in found]

    assert personas() == ["Riled up", "Not sure"]
    fields = dev.get("/api/set-fields").json()
    for f in fields["fields"]:
        if f["role"] == "persona":
            f["options"] = [o for o in f["options"] if o["id"] != "riled-up"]
    assert dev.put("/api/set-fields", json=fields).status_code == 200
    db.expire_all()
    assert personas() == ["Not sure", "Not sure"]
