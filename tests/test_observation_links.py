"""What came from an observation: the premises and jokes it was added to or started."""

import uuid

from fastapi.testclient import TestClient


def observation(client: TestClient) -> dict:  # type: ignore[type-arg]
    obs_id = str(uuid.uuid4())
    return client.put(f"/api/observations/{obs_id}", json={"text": "Fake thing noticed"}).json()


def link(client: TestClient, obs_id: str, kind: str, target: str, on: bool = True) -> int:
    url = f"/api/observations/{obs_id}/links/{kind}/{target}"
    return (client.put(url) if on else client.delete(url)).status_code


def stored(client: TestClient, obs_id: str) -> dict:  # type: ignore[type-arg]
    return next(o for o in client.get("/api/observations").json() if o["id"] == obs_id)


def test_a_new_one_has_no_links(alice: TestClient) -> None:
    obs = observation(alice)
    assert (obs["premise_ids"], obs["joke_ids"]) == ([], [])


def test_linking_twice_keeps_one_and_unlinking_twice_is_fine(alice: TestClient) -> None:
    obs, premise, joke = observation(alice), str(uuid.uuid4()), str(uuid.uuid4())
    assert link(alice, obs["id"], "premises", premise) == 204
    assert link(alice, obs["id"], "premises", premise) == 204
    assert link(alice, obs["id"], "jokes", joke) == 204
    saved = stored(alice, obs["id"])
    assert (saved["premise_ids"], saved["joke_ids"]) == ([premise], [joke])
    assert link(alice, obs["id"], "premises", premise, on=False) == 204
    assert link(alice, obs["id"], "premises", premise, on=False) == 204
    assert stored(alice, obs["id"])["premise_ids"] == []


def test_linking_doesnt_move_the_version_or_clash(alice: TestClient) -> None:
    """A link made on one device leaves an edit made on another from the same version fine."""
    obs = observation(alice)
    link(alice, obs["id"], "jokes", str(uuid.uuid4()))
    assert stored(alice, obs["id"])["version"] == obs["version"]
    body = {"text": "Edited elsewhere", "kind_id": None, "base_version": obs["version"]}
    assert alice.put(f"/api/observations/{obs['id']}", json=body).status_code == 200


def test_editing_the_words_keeps_the_links(alice: TestClient) -> None:
    obs, premise = observation(alice), str(uuid.uuid4())
    link(alice, obs["id"], "premises", premise)
    alice.put(f"/api/observations/{obs['id']}", json={"text": "Edited", "kind_id": None})
    assert stored(alice, obs["id"])["premise_ids"] == [premise]


def test_only_premises_and_jokes_can_be_linked(alice: TestClient) -> None:
    obs = observation(alice)
    assert link(alice, obs["id"], "sets", str(uuid.uuid4())) == 422


def test_someone_elses_observation_cant_be_linked(alice: TestClient, bob: TestClient) -> None:
    obs = observation(alice)
    assert link(bob, obs["id"], "premises", str(uuid.uuid4())) == 404
    assert link(bob, obs["id"], "premises", str(uuid.uuid4()), on=False) == 404
