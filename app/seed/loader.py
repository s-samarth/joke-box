"""Load data in the old Bit Vault (Firestore) shape: the demo set, or your real export."""

from datetime import date

from sqlalchemy.orm import Session

from app.auth.bootstrap import ensure_defaults, random_topic_for
from app.models import (
    Brainstorm,
    BrainstormVersion,
    Joke,
    PerformanceLog,
    Setlist,
    SetlistItem,
    Subtopic,
    Topic,
    User,
    Venue,
)
from app.schemas.library import JokeIn
from app.seed.convert import Json, seconds, split_tags, when, wipe
from app.services import jokes as joke_svc


class Loader:
    """One import run. Collects a report of what was loaded and what was skipped."""

    def __init__(self, db: Session, user: User) -> None:
        self.db, self.user = db, user
        self.topics: dict[str, Topic] = {}
        self.jokes: dict[str, Joke] = {}
        self.venues: dict[str, Venue] = {}
        self.report: dict[str, int] = {}
        self.skipped: list[str] = []

    def count(self, key: str) -> None:
        self.report[key] = self.report.get(key, 0) + 1

    def topic(self, name: str | None) -> Topic:
        if not name or name.lower() == "random":
            return random_topic_for(self.db, self.user)
        if name.lower() not in self.topics:
            self.topics[name.lower()] = Topic(user_id=self.user.id, name=name)
            self.db.add(self.topics[name.lower()])
            self.count("topics")
        return self.topics[name.lower()]

    def subtopic(self, topic: Topic, name: str | None) -> Subtopic | None:
        if not name:
            return None
        found = next((s for s in topic.subtopics if s.name.lower() == name.lower()), None)
        if found is None:
            found = Subtopic(user_id=self.user.id, name=name)
            topic.subtopics.append(found)
        return found

    def venue(self, name: str | None) -> Venue | None:
        if not name:
            return None
        if name.lower() not in self.venues:
            self.venues[name.lower()] = Venue(user_id=self.user.id, name=name)
            self.db.add(self.venues[name.lower()])
        return self.venues[name.lower()]

    def load_joke(self, b: Json) -> None:
        topic = self.topic(b.get("topic"))
        sub = self.subtopic(topic, b.get("subtopic"))
        self.db.flush()
        raw_types = b.get("type") or []
        punchline, tag_lines = split_tags(b.get("punchline") or "")
        comments = b.get("comments") or ""
        if b.get("versions"):
            history = "\n".join(f"- {v.get('label')}: {v.get('content')}" for v in b["versions"])
            comments = f"{comments}\n\nEarlier versions:\n{history}".strip()
        data = JokeIn(
            setup=b.get("setup") or "(no setup)",
            punchline=punchline,
            topic_id=topic.id,
            subtopic_id=sub.id if sub else None,
            types=raw_types if isinstance(raw_types, list) else [raw_types],
            status=b.get("status"),
            strength=min(max(int(b.get("rating") or 3), 1), 5),
            duration_seconds=seconds(b.get("duration")),
            hashtags=b.get("tags") or [],
            tag_lines=tag_lines + list(b.get("altPunchlines") or []),
            comments=comments,
            created_at=when(b.get("createdAt")),
        )
        joke = Joke(user_id=self.user.id, created_at=data.created_at)
        joke_svc.apply(self.db, self.user, joke, data)
        self.db.add(joke)
        self.db.flush()
        self.jokes[b["id"]] = joke
        self.count("jokes")

    def load_brainstorm(self, raw: Json) -> None:
        joke = self.jokes.get(raw.get("bitId", ""))
        if joke is None:
            self.skipped.append(f"brainstorm '{raw.get('title')}' (its joke no longer exists)")
            return
        versions = [
            BrainstormVersion(
                title=v.get("title", ""),
                content=v.get("content", ""),
                saved_at=when(v.get("savedAt")),
            )
            for v in raw.get("versions") or []
        ]
        self.db.add(
            Brainstorm(
                user_id=self.user.id,
                joke_id=joke.id,
                title=raw.get("title", ""),
                content=raw.get("content", ""),
                timer_seconds=int(raw.get("timerSeconds") or 0),
                versions=versions,
            )
        )
        self.count("brainstorms")

    def load_log(self, raw: Json) -> None:
        topics = [self.topic(name) for name in raw.get("setTopics") or []]
        self.db.add(
            PerformanceLog(
                user_id=self.user.id,
                venue=self.venue(raw.get("venueName")),
                performed_at=when(raw.get("date")),
                duration_seconds=seconds(raw.get("duration")),
                audience_size=int(raw.get("audienceSize") or 0),
                rating=min(max(int(raw.get("rating") or 3), 1), 5),
                notes=raw.get("comments") or raw.get("notes") or "",
                topics=list({t.id: t for t in topics}.values()),
            )
        )
        self.count("logs")

    def load_setlist(self, raw: Json) -> None:
        items = sorted(raw.get("bits") or [], key=lambda i: i.get("order", 0))
        kept = [i for i in items if i.get("bitId") in self.jokes]
        if len(kept) < len(items):
            self.skipped.append(
                f"{len(items) - len(kept)} deleted joke(s) in setlist '{raw.get('name')}'"
            )
        self.db.add(
            Setlist(
                user_id=self.user.id,
                name=raw.get("name") or "Untitled Setlist",
                show_date=date.fromisoformat(raw["date"][:10]) if raw.get("date") else None,
                target_seconds=seconds(raw.get("targetDuration")) or 900,
                venue=self.venue(raw.get("venue")),
                items=[
                    SetlistItem(
                        joke_id=self.jokes[i["bitId"]].id,
                        position=n,
                        duration_seconds=seconds(i.get("duration")),
                    )
                    for n, i in enumerate(kept)
                ],
            )
        )
        self.count("setlists")

    def run(self, data: Json) -> None:
        """Replace the user's data with `data`, in one transaction (the caller commits)."""
        wipe(self.db, self.user)
        ensure_defaults(self.db, self.user)
        for t in data.get("topics", []):
            topic = self.topic(t["name"])
            for name in t.get("subtopics") or []:
                self.subtopic(topic, name)
        for v in data.get("venues", []):
            self.venue(v["name"])
        for b in data.get("bits", []):
            self.load_joke(b)
        for raw in data.get("brainstorms", []):
            self.load_brainstorm(raw)
        for raw in data.get("logs", []):
            self.load_log(raw)
        for raw in data.get("setlists", []):
            self.load_setlist(raw)
        self.db.flush()
        joke_svc.prune_unused_types(self.db, self.user)
