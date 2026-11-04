"""More made-up demo material for the screenshots: premises under some jokes, and how the jokes
of the demo set went at the last few shows. Called by screenshot_demo.py; all invented."""

import uuid
from collections.abc import Callable
from typing import Any

from fastapi.testclient import TestClient

PREMISES = [
    ("Smart homes make you the least smart thing in the house",
     "Every gadget learns your habits, so you end up being the one who's predictable."),
    ("Adults are just kids with a bank balance",
     "Nobody feels grown up; we've all just agreed to stop admitting it."),
]  # fmt: skip
RESULTS = ["killed", "ok", "killed", "bombed", "ok", None]
JOKE_FIELDS = ["setup", "punchline", "topic_id", "subtopic_id", "types", "status", "comments",
               "duration_seconds", "hashtags", "tag_lines", "clean_rating", "language",
               "strength", "follows_id"]  # fmt: skip
LOG_FIELDS = ["venue_name", "performed_at", "duration_seconds", "audience_size", "rating",
              "topic_ids", "notes", "laughs"]  # fmt: skip


def add(c: TestClient, ok: Callable[[Any], Any]) -> None:
    jokes: list[Any] = ok(c.get("/api/jokes"))
    for n, (take, notes) in enumerate(PREMISES):
        pid = str(uuid.uuid4())
        resting = jokes[n * 3 : n * 3 + 3]
        ok(c.put(f"/api/premises/{pid}", json={
            "topic_id": resting[0]["topic_id"], "take": take, "notes": notes,
        }))  # fmt: skip
        for joke in resting:
            body = {k: joke[k] for k in JOKE_FIELDS} | {"premise_id": pid}
            ok(c.put(f"/api/jokes/{joke['id']}", json=body | {"base_version": joke["version"]}))
    [demo_set, *_] = ok(c.get("/api/setlists"))
    done = [i["joke_id"] for i in demo_set["items"]]
    logs = sorted(ok(c.get("/api/logs")), key=lambda log: log["performed_at"], reverse=True)
    for shift, log in enumerate(logs[:4]):
        results = RESULTS[shift:] + RESULTS[:shift]
        body = {k: log[k] for k in LOG_FIELDS}
        body["jokes"] = [
            {"joke_id": jid, "result": results[n % len(results)]} for n, jid in enumerate(done)
        ]
        ok(c.put(f"/api/logs/{log['id']}", json=body))
