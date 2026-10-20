"""Demo data for local development: `uv run python -m app.seed you@example.com`.

The content is the fake demo set from the original Bit Vault, never real material.
"""

import json
import re
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth.bootstrap import ensure_defaults, random_topic_for
from app.models import (
    Bit,
    Brainstorm,
    PerformanceLog,
    Setlist,
    SetlistItem,
    Subtopic,
    Topic,
    User,
    Venue,
)
from app.schemas.library import BitIn
from app.services import bits as bit_svc

DEMO = Path(__file__).with_name("demo.json")
Json = dict[str, Any]


def seconds(text: str | None) -> int:
    """'2m 30s' -> 150."""
    match = re.match(r"\s*(\d+)m\s*(\d+)s", text or "")
    return int(match[1]) * 60 + int(match[2]) if match else 0


def wipe(db: Session, user: User) -> None:
    """Remove every row the user owns, keeping the user."""
    for model in (PerformanceLog, Setlist, Brainstorm, Bit, Venue, Subtopic, Topic):
        db.execute(delete(model).where(model.user_id == user.id))
    db.flush()


def load_topics(db: Session, user: User, raw: list[Json]) -> dict[str, Topic]:
    topics = {"Random": random_topic_for(db, user)}
    for t in raw:
        if t["name"] == "Random":
            continue
        topic = Topic(user_id=user.id, name=t["name"])
        topic.subtopics = [Subtopic(user_id=user.id, name=s) for s in t["subtopics"]]
        db.add(topic)
        topics[t["name"]] = topic
    db.flush()
    return topics


def load_bits(db: Session, user: User, raw: list[Json], topics: dict[str, Topic]) -> dict[str, Bit]:
    bits: dict[str, Bit] = {}
    for b in raw:
        topic = topics[b["topic"]]
        sub = next((s for s in topic.subtopics if s.name == b.get("subtopic")), None)
        types = b["type"] if isinstance(b["type"], list) else [b["type"]]
        comments = b.get("comments", "")
        if b.get("versions"):
            comments += "\n\nEarlier versions:\n" + "\n".join(
                f"- {v['label']}: {v['content']}" for v in b["versions"]
            )
        data = BitIn(
            setup=b["setup"],
            punchline=b["punchline"],
            topic_id=topic.id,
            subtopic_id=sub.id if sub else None,
            types=types,
            status=b["status"],
            strength=b["rating"],
            duration_seconds=seconds(b.get("duration")),
            hashtags=b.get("tags", []),
            tag_lines=b.get("altPunchlines", []),
            comments=comments.strip(),
            created_at=datetime.fromisoformat(b["createdAt"]),
        )
        bit = Bit(user_id=user.id, created_at=data.created_at)
        bit_svc.apply(db, user, bit, data)
        db.add(bit)
        bits[b["id"]] = bit
    db.flush()
    return bits


def load_shows(
    db: Session, user: User, demo: Json, topics: dict[str, Topic], bits: dict[str, Bit]
) -> None:
    venues = {v["name"]: Venue(user_id=user.id, name=v["name"]) for v in demo["venues"]}
    db.add_all(venues.values())
    for log in demo["logs"]:
        db.add(
            PerformanceLog(
                user_id=user.id,
                venue=venues[log["venueName"]],
                performed_at=datetime.fromisoformat(log["date"]),
                duration_seconds=seconds(log["duration"]),
                audience_size=log["audienceSize"],
                rating=log["rating"],
                notes=log["comments"],
                topics=[topics[t] for t in log["setTopics"] if t in topics],
            )
        )
    for s in demo["setlists"]:
        items = sorted(s["bits"], key=lambda i: i["order"])
        db.add(
            Setlist(
                user_id=user.id,
                name=s["name"],
                show_date=date.fromisoformat(s["date"][:10]),
                target_seconds=seconds(s["targetDuration"]),
                venue=venues.get(s["venue"]),
                items=[
                    SetlistItem(
                        bit_id=bits[i["bitId"]].id,
                        position=n,
                        duration_seconds=seconds(i["duration"]),
                    )
                    for n, i in enumerate(items)
                ],
            )
        )


def reseed(db: Session, user: User) -> None:
    """Wipe the user's data and load the demo set."""
    demo = json.loads(DEMO.read_text())
    wipe(db, user)
    ensure_defaults(db, user)
    topics = load_topics(db, user, demo["topics"])
    bits = load_bits(db, user, demo["bits"], topics)
    load_shows(db, user, demo, topics, bits)
    bit_svc.prune_unused_types(db, user)
    db.commit()


if __name__ == "__main__":
    from app.auth.bootstrap import upsert_user
    from app.db import SessionLocal

    email = sys.argv[1] if len(sys.argv) > 1 else "dev@example.com"
    with SessionLocal() as session:
        existing = session.scalar(select(User).where(User.email == email.lower()))
        target = existing or upsert_user(session, email=email, google_sub=None, name="", avatar="")
        reseed(session, target)
        print(f"Loaded demo data for {email}")
