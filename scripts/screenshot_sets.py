"""A made-up set in beats for the Sets screenshots (docs/sets.md, screens-perform.md): four
labelled beats with premises, gates, a titled Standalone block and crowd work, plus a Vibe and a
Generic answer on some jokes and premises. Called by screenshot_demo.py; all invented."""

import uuid
from collections.abc import Callable
from typing import Any

from fastapi.testclient import TestClient

from scripts.screenshot_extras import JOKE_FIELDS

POINT = "Everything modern was built to make me feel stupid."
VIBES = ["bakchod", "riled-up", "point-prover", None]


def piece(joke: Any, gate: int = 0, loose: bool = False, *said: str) -> dict[str, Any]:
    out = {"id": f"p-{joke['id']}", "joke_id": joke["id"], "gate": gate, "loose": loose}
    return out | ({"bridges": bridges(*said)} if said else {})


def bridges(*said: str) -> list[dict[str, str]]:
    return [{"id": f"br-{n}-{len(text)}", "text": text} for n, text in enumerate(said)]


def beat(
    n: int,
    cue: str,
    seconds: int,
    labels: dict[str, str],
    about: str,
    *entries: Any,
    shift: str = "",
) -> dict[str, Any]:
    return {
        "id": f"b{n}",
        "cue": cue,
        "seconds": seconds,
        "labels": labels,
        "description": about,
        "shift_reason": shift,
        "entries": list(entries),
    }


def gadgets_and_dating(jokes: list[Any], premises: list[Any]) -> dict[str, Any]:
    j = jokes
    home = {
        "kind": "premise",
        "id": "e1",
        "premise_id": premises[0]["id"],
        "pieces": [
            piece(j[0], 2),
            piece(j[1], 0, False, "And it's not just the fridge. Everything is on my case now."),
            piece(j[2]),
            piece(j[3], loose=True),
        ],
        "bridges": bridges("Anyway. I tried to get away from all of it, so I went shopping."),
    }
    shopping = {"kind": "jokes", "id": "e2", "title": "Shopping", "pieces": [piece(j[4])]}
    grown = {
        "kind": "premise",
        "id": "e3",
        "premise_id": premises[1]["id"],
        "pieces": [piece(j[5], gate=1), piece(j[6]), piece(j[7])],
        "bridges": bridges(
            "So that's me. But I can't be the only one.",
            "Let me check. Hands up, honestly.",
        ),
    }
    crowd = {
        "kind": "crowd",
        "id": "e4",
        "title": "Anyone on the apps?",
        "questions": [
            {
                "id": "q1",
                "text": "Who here met their partner on an app?",
                "has_reply": True,
                "replies": [
                    {"id": "r1", "when": "Nobody", "line": "So you all met at a quiz night."}
                ],
            },
            {"id": "q2", "text": "Worst opening line you got?", "has_reply": False, "replies": []},
        ],
    }
    stand = {
        "kind": "jokes",
        "id": "e5",
        "title": "",
        "pieces": [piece(j[8]), piece(j[9], loose=True)],
    }
    callbacks = {
        "kind": "jokes",
        "id": "e6",
        "title": "Callbacks",
        "pieces": [piece(j[10]), piece(j[11])],
    }
    beats = [
        beat(
            1,
            "Smart home",
            240,
            {"status": "i-lose", "persona": "bakchod", "tone": "playful", "voice": "mine"},
            "Open on the gadgets: low status, everything at home outsmarts me.",
            home,
            shopping,
        ),
        beat(
            2,
            "Dating",
            300,
            {"status": "we-lose", "persona": "riled-up", "tone": "opinionated", "voice": "half"},
            "The turn: from gadgets to people, same helplessness.",
            grown,
            crowd,
        ),
        beat(
            3,
            "Airports",
            180,
            {"status": "neutral", "persona": "point-prover", "voice": "anyones"},
            "",
            stand,
            shift="Planned turn",
        ),
        beat(4, "Closer", 120, {"status": "i-win"}, "", callbacks),
    ]
    return {
        "name": "Gadgets and Dating",
        "point": POINT,
        "target_seconds": 1200,
        "status": "Work in Progress",
        "beats": beats,
    }


def add(c: TestClient, ok: Callable[[Any], Any]) -> None:
    jokes: list[Any] = ok(c.get("/api/jokes"))[:12]
    for n, joke in enumerate(jokes):
        body = {k: joke[k] for k in JOKE_FIELDS} | {
            "persona": VIBES[n % 4],
            "generic": None if n % 3 == 2 else False,
            "base_version": joke["version"],
        }
        ok(c.put(f"/api/jokes/{joke['id']}", json=body))
    premises: list[Any] = ok(c.get("/api/premises"))
    for n, p in enumerate(premises):
        body = {
            "topic_id": p["topic_id"],
            "take": p["take"],
            "notes": p["notes"],
            "persona": VIBES[n],
            "generic": False,
        }
        ok(c.put(f"/api/premises/{p['id']}", json=body))
    ok(c.put(f"/api/setlists/{uuid.uuid4()}", json=gadgets_and_dating(jokes, premises)))
