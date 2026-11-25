"""Sets as beats, as the jokes and premises in them change (docs/sets.md). Made-up material."""

import uuid

from fastapi.testclient import TestClient

from tests.conftest import random_topic_id
from tests.test_clusters import new, put_cluster
from tests.test_jokes import put_joke
from tests.test_premises import put_premise
from tests.test_set_beats import beat, jokes_entry, piece, put_beats


def test_a_premise_in_the_trash_keeps_its_place_in_a_set(alice: TestClient) -> None:
    premise = put_premise(alice, random_topic_id(alice)).json()["id"]
    set_id = str(uuid.uuid4())
    entry = {"kind": "premise", "id": "e1", "premise_id": premise, "gate": False, "pieces": []}
    put_beats(alice, set_id, beat(entry))
    alice.delete(f"/api/premises/{premise}")
    saved = put_beats(alice, set_id, beat(entry), name="Fake rename").json()
    assert saved["beats"][0]["entries"][0]["premise_id"] == premise


def test_items_list_what_the_beats_play_now(alice: TestClient) -> None:
    cid, (first, second) = new(alice, "Fake one", "Fake two")
    set_id = str(uuid.uuid4())
    put_beats(alice, set_id, beat(jokes_entry(piece(first, cluster_id=cid))))
    put_cluster(alice, cid, lead_joke_id=second)
    shown = next(s for s in alice.get("/api/setlists").json() if s["id"] == set_id)
    assert [i["joke_id"] for i in shown["items"]] == [second]


def test_a_joke_clustered_after_joining_a_set_follows_its_cluster(alice: TestClient) -> None:
    joke = put_joke(alice, setup="Fake alone").json()["id"]
    set_id = str(uuid.uuid4())
    put_beats(alice, set_id, beat(jokes_entry(piece(joke))))
    cid = str(uuid.uuid4())
    put_cluster(alice, cid, title="Fake core", lead_joke_id=joke)
    put_joke(alice, joke, setup="Fake alone", cluster_id=cid)
    saved = put_beats(alice, set_id, beat(jokes_entry(piece(joke)))).json()
    stored = saved["beats"][0]["entries"][0]["pieces"][0]
    assert (stored["cluster_id"], stored["pinned"]) == (cid, False)  # the lead: follows it


def test_an_old_build_cant_change_a_beats_sets_jokes(alice: TestClient) -> None:
    a, b = put_joke(alice).json()["id"], put_joke(alice).json()["id"]
    set_id = str(uuid.uuid4())
    put_beats(alice, set_id, beat(jokes_entry(piece(a))))
    items = [{"joke_id": a}, {"joke_id": b}]
    refused = alice.put(f"/api/setlists/{set_id}", json={"name": "Fake", "items": items})
    assert refused.status_code == 409
    same = alice.put(f"/api/setlists/{set_id}", json={"name": "Fake", "items": [{"joke_id": a}]})
    assert same.status_code == 200 and same.json()["name"] == "Fake"


def test_a_joke_erased_for_good_doesnt_break_an_old_builds_save(alice: TestClient) -> None:
    a, b = put_joke(alice).json()["id"], put_joke(alice).json()["id"]
    set_id = str(uuid.uuid4())
    put_beats(alice, set_id, beat(jokes_entry(piece(a), piece(b, 1))))
    alice.delete(f"/api/jokes/{b}")
    assert alice.delete(f"/api/trash/jokes/{b}").status_code == 204
    saved = alice.put(f"/api/setlists/{set_id}", json={"name": "Fake", "items": [{"joke_id": a}]})
    assert saved.status_code == 200
    assert [i["joke_id"] for i in saved.json()["items"]] == [a]


def test_a_gate_keeps_its_jokes_while_one_is_in_the_trash(alice: TestClient) -> None:
    a, b, c = (put_joke(alice).json()["id"] for _ in range(3))
    set_id = str(uuid.uuid4())
    put_beats(alice, set_id, beat(jokes_entry(piece(a, gate=2), piece(b, 1), piece(c, 2))))
    alice.delete(f"/api/jokes/{b}")
    shown = next(s for s in alice.get("/api/setlists").json() if s["id"] == set_id)
    sent = shown["beats"][0]["entries"][0]["pieces"]
    assert [(p["joke_id"], p["gate"]) for p in sent] == [(a, 1), (c, 0)]  # guards c, as before
    put_beats(alice, set_id, *shown["beats"])  # the app saves what it shows
    alice.post(f"/api/trash/jokes/{b}/restore")
    back = next(s for s in alice.get("/api/setlists").json() if s["id"] == set_id)
    pieces = back["beats"][0]["entries"][0]["pieces"]
    assert [(p["joke_id"], p["gate"]) for p in pieces] == [(a, 2), (b, 0), (c, 0)]


def test_a_gate_over_only_hidden_jokes_comes_back(alice: TestClient) -> None:
    a, b = (put_joke(alice).json()["id"] for _ in range(2))
    set_id = str(uuid.uuid4())
    put_beats(alice, set_id, beat(jokes_entry(piece(a, gate=1), piece(b, 1))))
    alice.delete(f"/api/jokes/{b}")
    shown = next(s for s in alice.get("/api/setlists").json() if s["id"] == set_id)
    put_beats(alice, set_id, *shown["beats"])
    alice.post(f"/api/trash/jokes/{b}/restore")
    back = next(s for s in alice.get("/api/setlists").json() if s["id"] == set_id)
    assert [p["gate"] for p in back["beats"][0]["entries"][0]["pieces"]] == [1, 0]
