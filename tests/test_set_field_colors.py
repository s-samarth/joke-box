"""Label options carry a colour: defaults by id, kept when an older app's save leaves it out."""

from fastapi.testclient import TestClient


def test_default_options_come_with_their_colours(alice: TestClient) -> None:
    fields = alice.get("/api/set-fields").json()["fields"]
    status = {o["id"]: o["color"] for o in fields[0]["options"]}
    assert status["i-win"] == "#74d3a8" and status["i-lose"] == "#ff5a47"
    assert all(o["color"] for f in fields for o in f["options"])


def test_a_picked_colour_is_kept_and_a_save_without_one_keeps_it(alice: TestClient) -> None:
    fields = alice.get("/api/set-fields").json()["fields"]
    tone = fields[2]
    tone["options"][0]["color"] = "#cbd5e1"
    tone["options"].append({"id": "new1", "label": "Made up", "color": "#e7a3e0"})
    assert alice.put("/api/set-fields", json={"fields": fields}).status_code == 200
    # An older app sends options with no colour at all.
    old = [
        f | {"options": [{"id": o["id"], "label": o["label"]} for o in f["options"]]}
        for f in fields
    ]
    out = alice.put("/api/set-fields", json={"fields": old}).json()["fields"][2]["options"]
    assert out[0]["color"] == "#cbd5e1" and out[-1]["color"] == "#e7a3e0"


def test_a_colour_must_be_hex(alice: TestClient) -> None:
    fields = alice.get("/api/set-fields").json()["fields"]
    fields[0]["options"][0]["color"] = "red"
    assert alice.put("/api/set-fields", json={"fields": fields}).status_code == 422
