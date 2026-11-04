"""Voice notes for Claude: what each recording is called and tagged, never the audio itself."""

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.connector.text import ist_date, matches, page
from app.models import User, VoiceNote


def tag_words(hashtags: list[str]) -> str:
    """Hashtags with and without their #, so `#name` and `name` both find one."""
    bare = [t.lstrip("#") for t in hashtags]
    return " ".join(bare + [f"#{t}" for t in bare])


def search_voice_notes(db: Session, user: User, query: str = "", limit: int = 25) -> dict[str, Any]:
    """Voice notes, newest first, found by every word of the query in the label or hashtags."""
    rows = db.scalars(
        select(VoiceNote).where(VoiceNote.user_id == user.id).order_by(VoiceNote.created_at.desc())
    )
    found = [n for n in rows if matches(query, n.label, tag_words(n.hashtags))]
    shown, total = page(found, limit)
    return {
        "total": total,
        "voice_notes": [
            {
                "id": str(n.id),
                "label": n.label,
                "hashtags": n.hashtags,
                "seconds": n.duration_seconds,
                "recorded": ist_date(n.created_at),
                "uploaded": n.has_audio,
            }
            for n in shown
        ],
    }
