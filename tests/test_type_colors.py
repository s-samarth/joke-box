"""Each type has a dot colour you can choose; new types get a distinct one."""

from fastapi.testclient import TestClient

from tests.test_bits import put_bit


def colors(client: TestClient) -> dict[str, str]:
    return {t["name"]: t["color"] for t in client.get("/api/types").json()}


def set_color(client: TestClient, name: str, color: str) -> int:
    return client.put("/api/types/color", json={"name": name, "color": color}).status_code


def test_defaults_keep_their_colours_and_others_get_distinct_ones(alice: TestClient) -> None:
    put_bit(alice, types=["Story", "Fake Form A", "Fake Form B"])
    got = colors(alice)
    assert got["Story"] == "#c4b5fd"
    assert len(set(got.values())) == 3


def test_colour_chosen_before_the_type_exists_is_kept(alice: TestClient) -> None:
    assert set_color(alice, "Fake Form", "#ABCDEF") == 204
    put_bit(alice, types=["fake form"])
    assert colors(alice) == {"fake form": "#abcdef"}


def test_recolour_and_bad_colours(alice: TestClient) -> None:
    put_bit(alice, types=["Roast"])
    assert set_color(alice, "roast", "#123456") == 204
    assert colors(alice)["Roast"] == "#123456"
    assert set_color(alice, "Roast", "red") == 422
    assert set_color(alice, " ", "#123456") == 422


def test_colour_survives_prune_and_follows_rename(alice: TestClient) -> None:
    bit = put_bit(alice, types=["Fake Form"]).json()
    set_color(alice, "Fake Form", "#111111")
    put_bit(alice, bit["id"], types=[], base_version=bit["version"])
    assert colors(alice) == {}
    put_bit(alice, types=["Fake Form"])
    assert colors(alice) == {"Fake Form": "#111111"}
    type_id = alice.get("/api/types").json()[0]["id"]
    alice.patch(f"/api/types/{type_id}", json={"name": "Fake Renamed"})
    assert colors(alice) == {"Fake Renamed": "#111111"}


def test_merge_keeps_the_targets_colour(alice: TestClient) -> None:
    put_bit(alice, types=["Fake A", "Fake B"])
    set_color(alice, "Fake A", "#aaaaaa")
    set_color(alice, "Fake B", "#bbbbbb")
    a_id = next(t["id"] for t in alice.get("/api/types").json() if t["name"] == "Fake A")
    alice.patch(f"/api/types/{a_id}", json={"name": "fake b"})
    assert colors(alice) == {"Fake B": "#bbbbbb"}


def test_colours_are_private(alice: TestClient, bob: TestClient) -> None:
    put_bit(alice, types=["Fake Form"])
    put_bit(bob, types=["Fake Form"])
    set_color(alice, "Fake Form", "#222222")
    assert colors(bob)["Fake Form"] != "#222222"
