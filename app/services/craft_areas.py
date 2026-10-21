"""Craft areas: the starting set every user gets, and deleting one without losing its notes."""

import uuid

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.models import CraftArea, CraftNote, User

# (name, description, colour, screens). Users can change all of it.
DEFAULT_AREAS: list[tuple[str, str, str, list[str]]] = [
    ("Writing", "Structure, setups, premises, tags, wordplay", "sky", ["rewrite"]),
    ("Generating", "Techniques for finding new material", "violet", []),
    ("Rewriting", "Checking and tightening a joke", "emerald", ["rewrite"]),
    ("Building a set", "Openers, running order, longer sets", "orange", ["sets"]),
    ("On stage", "Delivery, crowd work, hecklers", "rose", ["stage"]),
    ("Formats", "Topical, political and other kinds of comedy", "pink", []),
    ("Measuring and path", "How a set did, and where you are headed", "amber", []),
]


def ensure_craft_areas(db: Session, user: User) -> None:
    """Give a user the starting areas if they have none. Doesn't commit."""
    if db.scalar(select(func.count()).where(CraftArea.user_id == user.id)):
        return
    for position, (name, description, color, screens) in enumerate(DEFAULT_AREAS):
        db.add(
            CraftArea(
                user_id=user.id,
                name=name,
                description=description,
                color=color,
                screens=screens,
                position=position,
            )
        )
    db.flush()


def delete_area(db: Session, user: User, area: CraftArea, move_to: uuid.UUID | None) -> None:
    """Move the area's notes to another area, then delete it. The last area can't go."""
    others = list(
        db.scalars(
            select(CraftArea)
            .where(CraftArea.user_id == user.id, CraftArea.id != area.id)
            .order_by(CraftArea.position)
        )
    )
    if not others:
        raise HTTPException(400, "Keep at least one area")
    target = next((a for a in others if a.id == move_to), None)
    if move_to is not None and target is None:
        raise HTTPException(404, "Not found")
    target = target or others[0]
    db.execute(
        update(CraftNote)
        .where(CraftNote.user_id == user.id, CraftNote.area_id == area.id)
        .values(area_id=target.id)
    )
    db.delete(area)
    db.commit()


def reorder_areas(db: Session, user: User, ids: list[uuid.UUID]) -> None:
    """Save the areas in the order given. Ids that aren't yours are ignored."""
    areas = {a.id: a for a in db.scalars(select(CraftArea).where(CraftArea.user_id == user.id))}
    for position, area_id in enumerate(i for i in ids if i in areas):
        areas[area_id].position = position
    db.commit()
