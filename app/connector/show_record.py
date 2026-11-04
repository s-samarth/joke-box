"""Which jokes were done at each show and how they went, for list_shows and get_jokes.

Joining a show or a joke leaves out ones in the Trash (the session's global filter), so a
trashed show doesn't count towards a joke's record and a trashed joke isn't listed on a show.
"""

import uuid
from collections.abc import Iterable
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.connector.text import clip, ist_date
from app.models import Joke, PerformanceJoke, PerformanceLog, User


def jokes_done(
    db: Session, user: User, logs: Iterable[PerformanceLog]
) -> dict[uuid.UUID, list[dict[str, Any]]]:
    """Each show's jokes in running order: id, the start of the setup, how it went and the
    comment on it."""
    log_ids = [log.id for log in logs]
    rows = db.execute(
        select(
            PerformanceJoke.log_id,
            PerformanceJoke.joke_id,
            Joke.setup,
            PerformanceJoke.result,
            PerformanceJoke.note,
        )
        .join(Joke, Joke.id == PerformanceJoke.joke_id)
        .where(PerformanceJoke.log_id.in_(log_ids), Joke.user_id == user.id)
        .order_by(PerformanceJoke.log_id, PerformanceJoke.position)
    )
    done: dict[uuid.UUID, list[dict[str, Any]]] = {}
    for log_id, joke_id, setup, result, note in rows:
        done.setdefault(log_id, []).append(
            {"id": str(joke_id), "setup": clip(setup, 120), "result": result, "note": note}
        )
    return done


def records(
    db: Session, user: User, joke_ids: Iterable[uuid.UUID]
) -> dict[uuid.UUID, dict[str, Any]]:
    """Each joke's record across logged shows: how many it was done at, how each went, and the
    IST date it was last done. A joke never done gets zeros (see EMPTY)."""
    rows = db.execute(
        select(PerformanceJoke.joke_id, PerformanceJoke.result, PerformanceLog.performed_at)
        .join(PerformanceLog, PerformanceLog.id == PerformanceJoke.log_id)
        .where(PerformanceJoke.joke_id.in_(list(joke_ids)), PerformanceLog.user_id == user.id)
    )
    out: dict[uuid.UUID, dict[str, Any]] = {}
    last: dict[uuid.UUID, Any] = {}
    for joke_id, result, performed_at in rows:
        record = out.setdefault(joke_id, dict(EMPTY))
        record["shows_done"] += 1
        if result:
            record[result] += 1
        if joke_id not in last or performed_at > last[joke_id]:
            last[joke_id] = performed_at
            record["last_done"] = ist_date(performed_at)
    return out


EMPTY: dict[str, Any] = {"shows_done": 0, "killed": 0, "ok": 0, "bombed": 0, "last_done": None}
