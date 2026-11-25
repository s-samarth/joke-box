"""Sets as beats (docs/sets.md): what's stored, what's worked out, and older apps' saves."""

import uuid
from typing import Any

from fastapi.testclient import TestClient

from tests.conftest import random_topic_id
from tests.test_clusters import new, put_cluster
from tests.test_jokes import put_joke
from tests.test_premises import put_premise


def piece(joke_id: str, n: int = 0, **fields: Any) -> dict[str, Any]:
    return {"id": f"p{n}-{joke_id[:6]}", "joke_id": joke_id, **fields}


def jokes_entry(*pieces: dict[str, Any], entry_id: str = "e-jokes") -> dict[str, Any]:
    return {"kind": "jokes", "id": entry_id, "pieces": list(pieces)}


def beat(*entries: dict[str, Any], beat_id: str = "b1", **fields: Any) -> dict[str, Any]:
    return {"id": beat_id, "cue": "Fake cue", "seconds": 60, "entries": list(entries), **fields}


def put_beats(client: TestClient, set_id: str, *beats: dict[str, Any], **fields: Any) -> Any:
    return client.put(f"/api/setlists/{set_id}", json={"beats": list(beats), **fields})


def test_items_follow_the_beats(alice: TestClient) -> None:
    a, b = put_joke(alice).json()["id"], put_joke(alice).json()["id"]
    set_id = str(uuid.uuid4())
    one = beat(jokes_entry(piece(b, loose=True), piece(a), piece(b, 2)))
    saved = put_beats(alice, set_id, one, beat(beat_id="b2", seconds=30), point="Fake point")
    out = saved.json()
    assert [(i["joke_id"], i["optional"]) for i in out["items"]] == [(b, True), (a, False)]
    assert out["point"] == "Fake point"
    assert [x["id"] for x in out["beats"]] == ["b1", "b2"]


def test_gates_fit_their_list_and_the_first_premise_has_no_gate(alice: TestClient) -> None:
    a, b = put_joke(alice).json()["id"], put_joke(alice).json()["id"]
    premise = put_premise(alice, random_topic_id(alice)).json()["id"]
    gone = str(uuid.uuid4())
    entries = [
        {"kind": "premise", "id": "e1", "premise_id": premise, "gate": True, "pieces": []},
        jokes_entry(piece(a, gate=5), piece(b, gate=5)),
        {"kind": "premise", "id": "e3", "premise_id": gone, "gate": True, "pieces": []},
    ]
    out = put_beats(alice, str(uuid.uuid4()), beat(*entries)).json()["beats"][0]["entries"]
    assert (out[0]["premise_id"], out[0]["gate"]) == (premise, False)
    assert [p["gate"] for p in out[1]["pieces"]] == [1, 0]
    # A premise deleted while the save waited is let go; the gate after the first one stays.
    assert (out[2]["premise_id"], out[2]["gate"]) == (None, True)


def test_a_set_from_before_beats_reads_as_one_beat(alice: TestClient) -> None:
    a, b = put_joke(alice).json()["id"], put_joke(alice).json()["id"]
    set_id = str(uuid.uuid4())
    items = [{"joke_id": a, "duration_seconds": 50}, {"joke_id": b, "optional": True}]
    first = alice.put(f"/api/setlists/{set_id}", json={"items": items}).json()
    [only] = first["beats"]
    assert [(p["joke_id"], p["loose"]) for p in only["entries"][0]["pieces"]] == [
        (a, False),
        (b, True),
    ]
    # Saving it back unchanged, as the app does on opening, isn't a new version.
    again = put_beats(alice, set_id, only, base_version=first["version"]).json()
    assert again["version"] == first["version"]


def test_an_older_apps_save_keeps_the_beats(alice: TestClient) -> None:
    a, b = put_joke(alice).json()["id"], put_joke(alice).json()["id"]
    set_id = str(uuid.uuid4())
    put_beats(alice, set_id, beat(jokes_entry(piece(a))), point="Kept")
    old_app = alice.put(f"/api/setlists/{set_id}", json={"name": "Renamed", "items": []}).json()
    assert old_app["name"] == "Renamed" and old_app["point"] == "Kept"
    assert [i["joke_id"] for i in old_app["items"]] == [a]
    assert old_app["beats"][0]["entries"][0]["pieces"][0]["joke_id"] == a
    assert b not in {i["joke_id"] for i in old_app["items"]}


def test_a_cluster_plays_its_lead_unless_pinned(alice: TestClient) -> None:
    cid, (first, second) = new(alice, "Fake one", "Fake two")
    set_id = str(uuid.uuid4())
    following = piece(first, cluster_id=cid)
    pinned = piece(first, 1, cluster_id=cid, pinned=True)
    put_beats(alice, set_id, beat(jokes_entry(following, pinned)))
    put_cluster(alice, cid, lead_joke_id=second)
    [s] = alice.get("/api/setlists").json()
    assert [p["joke_id"] for p in s["beats"][0]["entries"][0]["pieces"]] == [second, first]


def test_a_joke_in_the_trash_keeps_its_place_in_the_beat(alice: TestClient) -> None:
    a, b, c = (put_joke(alice).json()["id"] for _ in range(3))
    set_id = str(uuid.uuid4())
    put_beats(alice, set_id, beat(jokes_entry(piece(a), piece(b), piece(c))))
    alice.delete(f"/api/jokes/{b}")
    [s] = alice.get("/api/setlists").json()
    shown = s["beats"][0]
    assert [p["joke_id"] for p in shown["entries"][0]["pieces"]] == [a, c]
    put_beats(alice, set_id, shown | {"cue": "Edited while it was away"})
    alice.post(f"/api/trash/jokes/{b}/restore")
    [back] = alice.get("/api/setlists").json()
    assert [p["joke_id"] for p in back["beats"][0]["entries"][0]["pieces"]] == [a, b, c]


def test_beats_take_only_your_jokes(alice: TestClient, bob: TestClient) -> None:
    joke = put_joke(alice).json()["id"]
    response = put_beats(bob, str(uuid.uuid4()), beat(jokes_entry(piece(joke))))
    assert response.status_code == 422
    set_id = str(uuid.uuid4())
    put_beats(alice, set_id, beat(jokes_entry(piece(joke))))
    assert bob.get("/api/setlists").json() == []


def test_an_edit_from_an_older_version_of_the_beats_is_refused(alice: TestClient) -> None:
    set_id = str(uuid.uuid4())
    first = put_beats(alice, set_id, beat()).json()
    put_beats(alice, set_id, beat(cue="Other device"), base_version=first["version"])
    stale = put_beats(alice, set_id, beat(cue="This device"), base_version=first["version"])
    assert stale.status_code == 409


def test_crowd_work_is_kept_as_written(alice: TestClient) -> None:
    reply = {"id": "r1", "when": "If they say yes", "line": "Fake line"}
    question = {"id": "q1", "text": "Fake question?", "has_reply": True, "replies": [reply]}
    crowd = {"kind": "crowd", "id": "c1", "title": "Fake room", "questions": [question]}
    out = put_beats(alice, str(uuid.uuid4()), beat(crowd)).json()
    assert out["beats"][0]["entries"][0] == crowd


def test_label_fields_start_as_the_defaults_and_are_yours(
    alice: TestClient, bob: TestClient
) -> None:
    start = alice.get("/api/set-fields").json()
    names = [f["name"] for f in start["fields"]]
    assert names == ["Status", "Dominant persona side", "Tone", "Voice fit"]
    assert start["top_up_seconds"] == 240
    status = start["fields"][0]
    assert [o["group"] for o in status["options"]] == ["win", "loss", "neutral", "loss", "loss"]
    mine = {"fields": [status | {"name": "Who wins"}], "top_up_seconds": 180}
    assert alice.put("/api/set-fields", json=mine).json() == mine
    assert alice.get("/api/set-fields").json() == mine
    assert bob.get("/api/set-fields").json() == start


def test_only_one_field_can_be_the_status_track(alice: TestClient) -> None:
    status = alice.get("/api/set-fields").json()["fields"][0]
    two = {"fields": [status, status | {"id": "other"}]}
    assert alice.put("/api/set-fields", json=two).status_code == 422
