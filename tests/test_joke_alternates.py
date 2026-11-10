"""A joke keeps the other punchlines tried for its setup; Claude reads them. Made-up material."""

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.connector import library
from tests.conftest import signed_in
from tests.test_connector_voice import user
from tests.test_jokes import put_joke


def test_a_new_joke_starts_with_none(alice: TestClient) -> None:
    assert put_joke(alice).json()["alt_punchlines"] == []


def test_alternates_are_kept_in_order_and_blank_ones_dropped(alice: TestClient) -> None:
    saved = put_joke(alice, alt_punchlines=["Fake ending one", "  ", " Fake ending two "]).json()
    assert saved["alt_punchlines"] == ["Fake ending one", "Fake ending two"]
    [listed] = alice.get("/api/jokes").json()
    assert listed["alt_punchlines"] == ["Fake ending one", "Fake ending two"]


def test_a_save_without_them_keeps_them_and_an_empty_list_clears(alice: TestClient) -> None:
    """An app from before alternates leaves the field out; that mustn't wipe them."""
    joke_id = str(uuid.uuid4())
    first = put_joke(alice, joke_id, alt_punchlines=["Fake other ending"]).json()
    older = put_joke(alice, joke_id, punchline="Fake punch", base_version=first["version"]).json()
    assert older["alt_punchlines"] == ["Fake other ending"]
    cleared = put_joke(alice, joke_id, alt_punchlines=[], base_version=older["version"]).json()
    assert cleared["alt_punchlines"] == []


def test_swapping_the_punch_with_an_alternate_is_one_save(alice: TestClient) -> None:
    joke_id = str(uuid.uuid4())
    first = put_joke(alice, joke_id, punchline="Fake first", alt_punchlines=["Fake second"]).json()
    swapped = put_joke(
        alice,
        joke_id,
        punchline="Fake second",
        alt_punchlines=["Fake first"],
        base_version=first["version"],
    ).json()
    assert (swapped["punchline"], swapped["alt_punchlines"]) == ("Fake second", ["Fake first"])
    assert swapped["version"] == first["version"] + 1


def test_alternates_come_back_from_the_trash(alice: TestClient) -> None:
    joke_id = put_joke(alice, alt_punchlines=["Fake other ending"]).json()["id"]
    alice.delete(f"/api/jokes/{joke_id}")
    assert alice.get("/api/jokes").json() == []
    assert alice.post(f"/api/trash/jokes/{joke_id}/restore").status_code < 300
    [back] = alice.get("/api/jokes").json()
    assert back["alt_punchlines"] == ["Fake other ending"]


def test_claude_reads_and_searches_the_alternates(db: Session) -> None:
    dev = signed_in("dev@example.com")
    joke = put_joke(dev, punchline="Fake punch", alt_punchlines=["Fake marmalade ending"]).json()
    me = user(db, "dev@example.com")
    [found] = library.get_jokes(db, me, [joke["id"]])["jokes"]
    assert found["alt_punchlines"] == ["Fake marmalade ending"]
    assert library.search_jokes(db, me, "marmalade")["total"] == 1
