"""Topics, subtopics and observation topics stay in the order you drag them into."""

from fastapi.testclient import TestClient


def add(client: TestClient, url: str, name: str) -> str:
    response = client.post(url, json={"name": name})
    assert response.status_code == 201
    return str(response.json()["id"])


def names(client: TestClient, url: str) -> list[str]:
    return [t["name"] for t in client.get(url).json()]


def test_topics_keep_your_order_with_thoughts_first(alice: TestClient) -> None:
    b = add(alice, "/api/topics", "Fake B")
    a = add(alice, "/api/topics", "Fake A")
    c = add(alice, "/api/topics", "Fake C")
    system = names(alice, "/api/topics")[0]
    assert names(alice, "/api/topics")[1:] == ["Fake B", "Fake A", "Fake C"]  # new ones go last
    assert alice.put("/api/topics/order", json={"ids": [c, a, b]}).status_code == 204
    assert names(alice, "/api/topics") == [system, "Fake C", "Fake A", "Fake B"]
    add(alice, "/api/topics", "Fake D")
    assert names(alice, "/api/topics")[-1] == "Fake D"


def test_a_stale_order_keeps_what_it_left_out(alice: TestClient, bob: TestClient) -> None:
    a = add(alice, "/api/topics", "Fake A")
    b = add(alice, "/api/topics", "Fake B")
    add(alice, "/api/topics", "Fake new")  # added on another device after the list loaded
    bobs = add(bob, "/api/topics", "Fake Bob")
    assert alice.put("/api/topics/order", json={"ids": [b, bobs, a, b]}).status_code == 204
    assert names(alice, "/api/topics")[1:] == ["Fake B", "Fake A", "Fake new"]
    assert names(bob, "/api/topics")[-1] == "Fake Bob"


def test_subtopics_keep_your_order(alice: TestClient, bob: TestClient) -> None:
    topic = add(alice, "/api/topics", "Fake topic")
    url = f"/api/topics/{topic}/subtopics"
    first, second = add(alice, url, "Fake 1"), add(alice, url, "Fake 2")
    assert alice.put(f"{url}/order", json={"ids": [second, first]}).status_code == 204
    [found] = [t for t in alice.get("/api/topics").json() if t["id"] == topic]
    assert [s["name"] for s in found["subtopics"]] == ["Fake 2", "Fake 1"]
    assert bob.put(f"{url}/order", json={"ids": [first, second]}).status_code == 404


def test_observation_topics_keep_your_order(alice: TestClient) -> None:
    url = "/api/observation-topics"
    first, second = add(alice, url, "Fake 1"), add(alice, url, "Fake 2")
    assert names(alice, url) == ["Fake 1", "Fake 2"]
    assert alice.put(f"{url}/order", json={"ids": [second, first]}).status_code == 204
    assert names(alice, url) == ["Fake 2", "Fake 1"]
