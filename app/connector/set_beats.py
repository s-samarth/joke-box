"""A set's beats for Claude: the shape the comic builds a set in (docs/sets.md). Labels come
with your field and option names, so Claude reads "Status: I lose", not ids."""

import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.connector.jokes import Names
from app.models import Setlist, User
from app.schemas.set_beats import BeatIn, CrowdEntry, PieceIn, PremiseEntry
from app.services.set_beats import Jokes, cluster_leads, shown, stored_beats
from app.services.set_fields import config_of, fields_out

NOT_SURE = "Not sure"


def live_beats(db: Session, user: User, s: Setlist, jokes: set[uuid.UUID]) -> list[BeatIn]:
    """The beats as the app shows them, over `jokes` (the live ones)."""
    return shown(stored_beats(s), Jokes(set(), {j: 0 for j in jokes}, cluster_leads(db, user)))


def label_names(db: Session, user: User) -> list[tuple[str, str, dict[str, str]]]:
    """Each field: its id, its name and its options' labels by id."""
    fields = fields_out(config_of(db, user)).fields
    return [(f.id, f.name, {o.id: o.label for o in f.options}) for f in fields]


def piece_out(p: PieceIn, places: dict[str, int]) -> dict[str, Any]:
    return {
        "place": places[p.id],
        "joke_id": str(p.joke_id),
        "loose": p.loose,
        # If this joke doesn't land, the next `guards` jokes in its list are skipped.
        "guards": p.gate,
        "cluster_id": str(p.cluster_id) if p.cluster_id else None,
        "pinned_version": p.pinned,
    }


def entry_out(entry: Any, names: Names, places: dict[str, int]) -> dict[str, Any]:
    if isinstance(entry, CrowdEntry):
        return {
            "kind": "crowd_work",
            "title": entry.title,
            "questions": [
                {
                    "question": q.text,
                    "has_reply": q.has_reply,
                    "replies": [{"if_they_say": r.when, "line": r.line} for r in q.replies],
                }
                for q in entry.questions
            ],
        }
    jokes = [piece_out(p, places) for p in entry.pieces]
    if isinstance(entry, PremiseEntry):
        take = names.premises.get(entry.premise_id) if entry.premise_id else None
        return {
            "kind": "premise",
            "premise_id": str(entry.premise_id) if entry.premise_id else None,
            "premise": take,
            "only_if_previous_premise_landed": entry.gate,
            "jokes": jokes,
        }
    return {"kind": "jokes_without_premise", "title": entry.title or None, "jokes": jokes}


def beats_out(
    beats: list[BeatIn],
    fields: list[tuple[str, str, dict[str, str]]],
    names: Names,
    places: dict[str, int],
) -> list[dict[str, Any]]:
    """Every beat in order, with when it starts (beat times added up, not joke times)."""
    out, start = [], 0
    for beat in beats:
        out.append(
            {
                "cue": beat.cue,
                "description": beat.description,
                "seconds": beat.seconds,
                "starts_at_seconds": start,
                "labels": {
                    name: options.get(beat.labels.get(fid, ""), NOT_SURE)
                    for fid, name, options in fields
                },
                "shift_reason": beat.shift_reason or None,
                "entries": [entry_out(e, names, places) for e in beat.entries],
            }
        )
        start += beat.seconds
    return out
