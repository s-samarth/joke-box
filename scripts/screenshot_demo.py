"""Fill the demo account with made-up material, so README screenshots show every feature.

The material is in screenshot_demo.json and is all invented; never put real jokes in it. See
"Regenerating icons and screenshots" in docs/development.md for the steps:

    PYTHONPATH=. uv run python scripts/screenshot_demo.py <folder with note0-2.m4a>
"""

import json
import math
import random
import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from app.main import app

DATA = json.loads((Path(__file__).parent / "screenshot_demo.json").read_text())
NOW = datetime.now(UTC)
random.seed(7)
c = TestClient(app, headers={"X-Requested-With": "jokebox"})
assert c.get("/auth/dev-login", follow_redirects=False).status_code == 303


def ok(r: Any) -> Any:
    assert r.status_code < 300, (r.request.method, r.request.url, r.status_code, r.text[:300])
    return r.json() if r.content else None


def new_id() -> str:
    return str(uuid.uuid4())


def ago(days: float, hour: int = 14) -> str:
    return (NOW - timedelta(days=days)).replace(hour=hour, minute=30).isoformat()


def seed_jokes(topics: dict[str, Any]) -> list[Any]:
    """Varied strengths on the demo jokes, and a joke on most of the last two weeks."""
    jokes: list[Any] = ok(c.get("/api/jokes"))
    fields = ["setup", "punchline", "topic_id", "subtopic_id", "types", "status", "comments",
              "duration_seconds", "hashtags", "tag_lines", "clean_rating", "language"]  # fmt: skip
    for b, strength in zip(
        jokes, [5, 4, 4, 3, 2, 5, 3, 4, 1, 3, 4, 2, 5, 3, 4, 3, 2], strict=False
    ):
        body = {k: b[k] for k in fields} | {"strength": strength, "base_version": b["version"]}
        ok(c.put(f"/api/jokes/{b['id']}", json=body))
    for days, (setup, topic) in zip([0, 1, 2, 3, 5, 6, 7, 9, 10, 12], DATA["daily"], strict=True):
        body = {"setup": setup, "topic_id": topics[topic]["id"], "types": ["One-liner"],
                "status": "Draft", "strength": random.choice([2, 3, 4]),
                "created_at": ago(days)}  # fmt: skip
        ok(c.put(f"/api/jokes/{new_id()}", json=body))
    return jokes


def shows(topic_ids: list[str]) -> None:
    """Six months of shows, so Timeline and Insights have a story to tell."""
    venues = DATA["venues"]
    for i in range(26):
        rating = random.choices([2, 3, 4, 5], [2, 5, 4, 1])[0]
        laughs = [random.randint(2, 8), random.randint(2, 6), random.randint(1, 5), rating - 1, 0]
        ok(c.put(f"/api/logs/{new_id()}", json={
            "venue_name": venues[i % 4] if i % 5 else venues[0], "performed_at": ago(i * 6.5 + 2),
            "duration_seconds": random.choice([300, 300, 420, 600]),
            "audience_size": random.randint(12, 60), "rating": rating,
            "topic_ids": random.sample(topic_ids, random.randint(1, 2)),
            "notes": random.choice(DATA["show_notes"]), "laughs": laughs if i % 3 == 0 else None,
        }))  # fmt: skip


def sets(jokes: list[Any]) -> None:
    """The demo set rated and tagged with an optional joke, and two more to filter."""
    tags = {t["name"]: t["id"] for t in ok(c.get("/api/set-tags"))}
    [first] = ok(c.get("/api/setlists"))
    items = [
        {"joke_id": i["joke_id"], "duration_seconds": i["duration_seconds"], "optional": n == 2}
        for n, i in enumerate(first["items"])
    ]
    keep = ["name", "show_date", "target_seconds", "venue_name"]
    tag_ids = [tags["In progress"], tags["Opener set"]]
    body = {k: first[k] for k in keep} | {"rating": 4, "tag_ids": tag_ids, "items": items}
    ok(c.put(f"/api/setlists/{first['id']}", json=body))
    for name, rating, names, picks, target in DATA["sets"]:
        items = [{"joke_id": jokes[p]["id"], "duration_seconds": 75} for p in picks]
        ok(c.put(f"/api/setlists/{new_id()}", json={
            "name": name, "target_seconds": target, "venue_name": "Rooftop Open Mic",
            "rating": rating, "tag_ids": [tags[t] for t in names], "items": items,
        }))  # fmt: skip


def observations() -> list[str]:
    topics = {n: ok(c.post("/api/observation-topics", json={"name": n}))["id"]
              for n in DATA["observation_topics"]}  # fmt: skip
    ids = []
    for n, (text, topic) in enumerate(DATA["observations"]):
        ids.append(new_id())
        body = {"text": text, "topic_id": topics.get(topic), "created_at": ago(n * 3)}
        ok(c.put(f"/api/observations/{ids[-1]}", json=body))
    return ids


def voice_notes(audio: Path) -> None:
    for n, (label, hashtags) in enumerate(DATA["voice_notes"]):
        vid = new_id()
        body = {"label": label, "hashtags": hashtags, "duration_seconds": 20 + n * 15,
                "created_at": ago(n * 2, hour=13)}  # fmt: skip
        ok(c.put(f"/api/voice-notes/{vid}", json=body))
        data = (audio / f"note{n}.m4a").read_bytes()
        ok(
            c.put(
                f"/api/voice-notes/{vid}/audio", content=data, headers={"Content-Type": "audio/mp4"}
            )
        )


def craft() -> list[str]:
    """Craft notes of every kind; returns the techniques."""
    areas = {a["name"]: a["id"] for a in ok(c.get("/api/craft-areas"))}
    kinds = {k["name"]: k["id"] for k in ok(c.get("/api/craft-kinds"))}
    techniques = []
    for n, (title, kind, area, body) in enumerate(DATA["craft"]):
        nid = new_id()
        note = {"title": title, "body": body, "kind_id": kinds[kind], "area_id": areas[area]}
        ok(c.put(f"/api/craft-notes/{nid}", json=note | {"position": n}))
        if kind == "Technique":
            techniques.append(nid)
    return techniques


def stroke(points: list[tuple[float, float]]) -> dict[str, Any]:
    return {"color": "#f2d16b", "size": 4, "points": [[x, y, 0.6] for x, y in points]}


def writing(jokes: list[Any], observation_ids: list[str], technique: str) -> None:
    """A brainstorm with typing and handwriting, and a rewrite with saved versions."""
    fridge = next(b for b in jokes if b["setup"].startswith("So I bought a smart fridge"))
    circle = [(620 + 90 * math.cos(t / 20 * math.tau), 210 + 45 * math.sin(t / 20 * math.tau))
              for t in range(21)]  # fmt: skip
    arrow = [(520.0, 330.0), (680.0, 270.0)]
    head = [(650.0, 262.0), (680.0, 270.0), (662.0, 296.0)]
    underline = [(90.0 + i * 40, 150.0 + (i % 2) * 3) for i in range(9)]
    ink = [circle, arrow, head, underline]
    ok(c.put(f"/api/sessions/{new_id()}", json=DATA["session"] | {
        "timer_seconds": 600, "technique_id": technique, "ink": [stroke(s) for s in ink],
        "joke_ids": [fridge["id"]], "observation_ids": [observation_ids[6]],
    }))  # fmt: skip
    rewrite = new_id()
    for text in DATA["rewrite"]["versions"]:
        body = {"joke_id": fridge["id"], "title": DATA["rewrite"]["title"], "content": text}
        ok(c.put(f"/api/brainstorms/{rewrite}", json=body | {"timer_seconds": 300}))


def study() -> None:
    """The watchlist from the dossier, some of it watched, and an analysis of one routine."""
    watch = ok(c.post("/api/watchlist/import-dossier"))
    fields = ["title", "comedian", "category", "description", "url", "position",
              "schemer_index", "logic_density", "dark_pragmatism"]  # fmt: skip
    for w in watch[:7]:
        ok(c.put(f"/api/watchlist/{w['id']}", json={k: w[k] for k in fields} | {"watched": True}))
    title = f"How {watch[0]['comedian'] or 'the set'} builds a premise"
    body = {"title": title, "url": "", "watch_item_id": watch[0]["id"], "body": DATA["analysis"]}
    ok(c.put(f"/api/analyses/{new_id()}", json=body))


def trash(topics: dict[str, Any], observation_ids: list[str]) -> None:
    joke, note = new_id(), new_id()
    topic = topics["Observational"]["id"]
    ok(c.put(f"/api/jokes/{joke}", json={"setup": DATA["trash"]["joke"], "topic_id": topic}))
    ok(c.put(f"/api/observations/{note}", json={"text": DATA["trash"]["observation"]}))
    for url in (f"/api/jokes/{joke}", f"/api/observations/{note}",
                f"/api/observations/{observation_ids[3]}"):  # fmt: skip
        ok(c.delete(url))


def main() -> None:
    topics = {t["name"]: t for t in ok(c.get("/api/topics"))}
    jokes = seed_jokes(topics)
    shows([t["id"] for t in topics.values() if not t["is_system"]])
    sets(jokes)
    observation_ids = observations()
    voice_notes(Path(sys.argv[1]))
    writing(jokes, observation_ids, craft()[0])
    study()
    trash(topics, observation_ids)
    print(f"Done: {len(ok(c.get('/api/jokes')))} jokes, {len(ok(c.get('/api/logs')))} shows")


if __name__ == "__main__":
    main()
