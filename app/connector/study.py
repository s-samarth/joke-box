"""Study tools: Craft notes, and your analyses of other comics' work."""

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.connector.library import parse_id
from app.connector.text import by_id, clip, ist_date, matches, page, same_name
from app.models import Analysis, CraftArea, CraftNote, User, WatchItem


def craft_notes(db: Session, user: User) -> list[CraftNote]:
    query = select(CraftNote).where(CraftNote.user_id == user.id).order_by(CraftNote.position)
    return list(db.scalars(query))


def area_names(db: Session, user: User) -> dict[Any, str]:
    query = select(CraftArea.id, CraftArea.name).where(CraftArea.user_id == user.id)
    return by_id(db.execute(query))


def search_craft(
    db: Session, user: User, query: str = "", area: str = "", kind: str = "", limit: int = 25
) -> dict[str, Any]:
    """Craft notes matching the query in their title, text or hashtags. An empty query lists
    them all, which is a good way to see what the notes cover."""
    areas = area_names(db, user)
    found = [
        n
        for n in craft_notes(db, user)
        if matches(query, n.title, n.body, " ".join(n.hashtags or []), n.source)
        and same_name(area, areas.get(n.area_id))
        and same_name(kind, n.kind.name)
    ]
    shown, total = page(found, limit if query else 200)
    return {
        "total": total,
        "notes": [
            {
                "id": str(n.id),
                "title": n.title,
                "area": areas.get(n.area_id),
                "kind": n.kind.name,
                "hashtags": list(n.hashtags or []),
                "preview": clip(n.body, 280) if query else None,
            }
            for n in shown
        ],
    }


def get_craft_notes(db: Session, user: User, ids: list[str]) -> dict[str, Any]:
    """Up to 10 Craft notes in full."""
    areas = area_names(db, user)
    wanted = [parse_id(i) for i in ids[:10]]
    notes = {n.id: n for n in craft_notes(db, user) if n.id in wanted}
    return {
        "notes": [
            {
                "id": str(n.id),
                "title": n.title,
                "area": areas.get(n.area_id),
                "kind": n.kind.name,
                "hashtags": list(n.hashtags or []),
                "source": n.source,
                "url": n.url,
                "body": clip(n.body, 20000),
            }
            for i in wanted
            if (n := notes.get(i))
        ],
        "not_found": [str(i) for i in wanted if i not in notes],
    }


def search_analyses(db: Session, user: User, query: str = "", limit: int = 25) -> dict[str, Any]:
    """Your write-ups of sets and jokes you studied, with the watchlist routine each is about."""
    routines = {w.id: w for w in db.scalars(select(WatchItem).where(WatchItem.user_id == user.id))}
    rows = db.scalars(
        select(Analysis).where(Analysis.user_id == user.id).order_by(Analysis.updated_at.desc())
    )

    def about(a: Analysis) -> str:
        r = routines.get(a.watch_item_id) if a.watch_item_id else None
        return f"{r.title} ({r.comedian})".replace(" ()", "") if r else ""

    found = [a for a in rows if matches(query, a.title, a.body, about(a))]
    shown, total = page(found, limit)
    return {
        "total": total,
        "analyses": [
            {
                "id": str(a.id),
                "title": a.title,
                "routine": about(a) or None,
                "preview": clip(a.body, 400),
                "updated": ist_date(a.updated_at),
            }
            for a in shown
        ],
    }


def get_analysis(db: Session, user: User, analysis_id: str) -> dict[str, Any]:
    analysis = db.scalar(
        select(Analysis).where(Analysis.id == parse_id(analysis_id), Analysis.user_id == user.id)
    )
    if analysis is None:
        raise ValueError(f"No analysis with id {analysis_id}")
    routine = db.get(WatchItem, analysis.watch_item_id) if analysis.watch_item_id else None
    return {
        "id": str(analysis.id),
        "title": analysis.title,
        "url": analysis.url,
        "routine": routine and {"title": routine.title, "comedian": routine.comedian},
        "body": clip(analysis.body, 20000),
    }
