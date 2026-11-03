"""One Brainstorm session in full for Claude, its handwriting included as images of the pages.

Claude reads the handwriting from the images itself, so there's no transcription service to run
or pay for. The pages are drawn as the app shows them (see ink_image.py).
"""

import json
from typing import Any

from mcp.server.mcpserver import Image
from mcp.types import TextContent
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.connector.ink_image import draw_page, pages_with_ink, strokes_on
from app.connector.library import parse_id
from app.connector.text import clip, ist_date
from app.models import Brainstorm, CraftNote, Joke, User, WritingSession

# The images travel base64-encoded (a third bigger) in one answer, and the host refuses answers
# over 4.5 MB. A typical page is well under 300 KB; dense ones continue in a second call.
PNG_BUDGET = 2_500_000

Blocks = list[TextContent | Image]


def as_json(about: dict[str, Any]) -> TextContent:
    return TextContent(type="text", text=json.dumps(about, ensure_ascii=False))


def get_rewrite(db: Session, user: User, rewrite: Brainstorm) -> Blocks:
    """A Rewrite (one joke reworked) is typed only, so it's one JSON block."""
    joke = db.scalar(select(Joke.setup).where(Joke.id == rewrite.joke_id, Joke.user_id == user.id))
    about = {
        "kind": "rewrite",
        "id": str(rewrite.id),
        "joke_id": str(rewrite.joke_id),
        "joke_setup": clip(joke, 240) if joke is not None else None,
        "title": rewrite.title,
        "text": clip(rewrite.content, 6000),
        "updated": ist_date(rewrite.updated_at),
    }
    return [as_json(about)]


def get_brainstorm(db: Session, user: User, brainstorm_id: str, from_page: int = 1) -> Blocks:
    """A Brainstorm session with its handwritten pages, or a Rewrite: search_brainstorms lists
    both, so either id opens here."""
    wanted = parse_id(brainstorm_id)
    session = db.scalar(
        select(WritingSession).where(WritingSession.id == wanted, WritingSession.user_id == user.id)
    )
    if session is None:
        rewrite = db.scalar(
            select(Brainstorm).where(Brainstorm.id == wanted, Brainstorm.user_id == user.id)
        )
        if rewrite is not None:
            return get_rewrite(db, user, rewrite)
        raise ValueError(f"No brainstorm with id {brainstorm_id}")
    technique = session.technique_id and db.scalar(
        select(CraftNote.title).where(
            CraftNote.id == session.technique_id, CraftNote.user_id == user.id
        )
    )
    ink = session.ink or []
    pages = pages_with_ink(ink)
    shown: list[tuple[int, bytes]] = []
    used, more_from = 0, None
    for number in (p for p in pages if p + 1 >= from_page):
        png = draw_page(strokes_on(ink, number))
        if shown and used + len(png) > PNG_BUDGET:
            more_from = number + 1
            break
        shown.append((number, png))
        used += len(png)
    about = {
        "kind": "brainstorm",
        "id": str(session.id),
        "title": session.title,
        "text": clip(session.content, 6000),
        "technique": technique or None,
        "linked_joke_ids": [str(i) for i in session.joke_ids or []],
        "linked_observation_ids": [str(i) for i in session.observation_ids or []],
        "updated": ist_date(session.updated_at),
        "handwritten_pages": [p + 1 for p in pages],
        "pages_shown": [p + 1 for p, _ in shown],
        "more_from_page": more_from,
    }
    blocks: Blocks = [as_json(about)]
    for number, png in shown:
        blocks += [
            TextContent(type="text", text=f"Page {number + 1}"),
            Image(data=png, format="png"),
        ]
    return blocks
