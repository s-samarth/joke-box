"""Each type's dot colour. Colours are kept by name, so a type that is pruned and comes back
keeps the colour you gave it."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import TypeColor, User

# The seven common forms keep the colours they have always had in the app.
DEFAULT_COLORS = {
    "one-liner": "#7dd3fc",
    "story": "#c4b5fd",
    "crowd work": "#fcd34d",
    "roast": "#fb7185",
    "observation": "#6ee7b7",
    "premise": "#f9a8d4",
    "act out": "#fdba74",
}

# Handed to other new types in this order, skipping colours already in use: first the light
# shades the defaults leave free, then the strong ones. Every one is in the app's swatch grid.
AUTO_COLORS = [
    "#fde047", "#5eead4", "#fca5a5", "#93c5fd", "#bef264", "#f0abfc", "#67e8f9",
    "#d8b4fe", "#86efac", "#a5b4fc", "#f97316", "#0ea5e9", "#8b5cf6", "#10b981",
    "#f43f5e", "#f59e0b", "#ec4899", "#3b82f6", "#84cc16", "#14b8a6", "#ef4444",
    "#eab308", "#a855f7", "#06b6d4", "#22c55e", "#6366f1", "#d946ef",
]  # fmt: skip


def _find(db: Session, user: User, name: str) -> TypeColor | None:
    return db.scalar(
        select(TypeColor).where(
            TypeColor.user_id == user.id, func.lower(TypeColor.name) == name.lower()
        )
    )


def colors_by_name(db: Session, user: User) -> dict[str, str]:
    """Lower-cased type name to its colour."""
    rows = db.scalars(select(TypeColor).where(TypeColor.user_id == user.id))
    return {row.name.lower(): row.color for row in rows}


def pick_color(name: str, used: set[str]) -> str:
    """A default type's own colour, else the first free one, else cycle through them."""
    if name.lower() in DEFAULT_COLORS:
        return DEFAULT_COLORS[name.lower()]
    free = [c for c in AUTO_COLORS if c not in used]
    return free[0] if free else AUTO_COLORS[len(used) % len(AUTO_COLORS)]


def ensure_color(db: Session, user: User, name: str) -> None:
    """Give a type a colour the first time it is used."""
    if _find(db, user, name) is None:
        used = set(colors_by_name(db, user).values())
        db.add(TypeColor(user_id=user.id, name=name, color=pick_color(name, used)))
        db.flush()


def set_color(db: Session, user: User, name: str, color: str) -> None:
    row = _find(db, user, name)
    if row is None:
        db.add(TypeColor(user_id=user.id, name=name, color=color))
    else:
        row.color = color
    db.flush()


def rename(db: Session, user: User, old: str, new: str) -> None:
    """A renamed type keeps its colour; merging into a type that has one keeps the target's."""
    row = _find(db, user, old)
    if row is None:
        return
    target = _find(db, user, new)
    if target is None or target.id == row.id:
        row.name = new
    else:
        db.delete(row)
    db.flush()
