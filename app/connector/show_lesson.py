"""What the comic learned at a show logged by set-review: saved the way the app's "What did you
learn?" saves it, as a Craft note linked to the show, in the area that shows on Stage. Logging the
show again updates that same note instead of adding another."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.connector.text import ist_date
from app.models import CraftArea, CraftNote, NoteKind, PerformanceLog, User
from app.services.craft_areas import ensure_craft_areas
from app.services.craft_kinds import ensure_craft_kinds

TITLE_MAX = 80
MARK = "(set-review)"


def lesson_title(text: str) -> str:
    """The first line names the lesson, cut at a word if it's long (as the app does)."""
    first = text.strip().split("\n")[0].strip()
    if len(first) <= TITLE_MAX:
        return first
    cut = first.rfind(" ", 0, TITLE_MAX)
    return f"{first[: cut if cut > 0 else TITLE_MAX]}…"


def filing(db: Session, user: User) -> tuple[CraftArea, NoteKind]:
    """The area that shows on Stage (else the first), and the first Reference kind (else any)."""
    ensure_craft_areas(db, user)
    ensure_craft_kinds(db, user)
    areas = list(
        db.scalars(
            select(CraftArea).where(CraftArea.user_id == user.id).order_by(CraftArea.position)
        )
    )
    kinds = list(
        db.scalars(select(NoteKind).where(NoteKind.user_id == user.id).order_by(NoteKind.position))
    )
    area = next((a for a in areas if "stage" in (a.screens or [])), areas[0])
    kind = next((k for k in kinds if k.behaviour == "reference"), kinds[0])
    return area, kind


def save_lesson(db: Session, user: User, log: PerformanceLog, text: str) -> CraftNote | None:
    """Save or update the show's lesson. Empty text leaves any lesson there is alone."""
    text = text.strip()
    if not text:
        return None
    note = db.scalar(
        select(CraftNote).where(
            CraftNote.user_id == user.id,
            CraftNote.performance_log_id == log.id,
            CraftNote.source.endswith(MARK),
        )
    )
    title = lesson_title(text)
    body = "" if text == title else text
    venue = log.venue.name if log.venue else "Unidentified Venue"
    source = f"Show at {venue}, {ist_date(log.performed_at)} {MARK}"
    if note is None:
        area, kind = filing(db, user)
        last = db.scalar(select(func.max(CraftNote.position)).where(CraftNote.user_id == user.id))
        note = CraftNote(
            user_id=user.id,
            area_id=area.id,
            kind_id=kind.id,
            hashtags=[],
            url="",
            position=(last or 0) + 1,
            performance_log_id=log.id,
        )
        db.add(note)
    else:
        note.version += 1
    note.title, note.body, note.source = title, body, source
    db.commit()
    return note
