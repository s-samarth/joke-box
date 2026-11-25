"""A set's beats, read and saved. The rules here are explained in docs/sets.md.

Beats are stored as JSON on the set. Three things are worked out from them rather than stored:
the joke a cluster plays (its lead, unless the set pins a version), which jokes are hidden (in
the Trash, they keep their place for when they come back), and the set's flat `items`, which
"In sets" on a joke and the connector's "sets it's in" read.
"""

import uuid
from collections.abc import Iterator
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Joke, JokeCluster, Premise, Setlist, User
from app.models.trash import INCLUDE_TRASHED
from app.schemas.set_beats import BeatIn, JokesEntry, PieceIn, PremiseEntry
from app.schemas.shows import SetlistItemIn


@dataclass
class Jokes:
    """What a set needs to know about your jokes to show its beats."""

    hidden: set[uuid.UUID]
    runtimes: dict[uuid.UUID, int]
    leads: dict[uuid.UUID, uuid.UUID] = field(default_factory=dict)

    def live(self, joke_id: uuid.UUID) -> bool:
        return joke_id in self.runtimes and joke_id not in self.hidden


def cluster_leads(db: Session, user: User) -> dict[uuid.UUID, uuid.UUID]:
    rows = db.execute(
        select(JokeCluster.id, JokeCluster.lead_joke_id).where(JokeCluster.user_id == user.id)
    )
    return {cid: lead for cid, lead in rows if lead is not None}


def legacy_beats(s: Setlist) -> list[BeatIn]:
    """A set saved before beats reads as one beat with its jokes in order, timed by the jokes it
    had. Its ids come from the set's, so reading it twice gives the same beat."""
    if not s.items:
        return []
    pieces = [
        PieceIn(id=str(item.joke_id), joke_id=item.joke_id, loose=item.optional)
        for item in sorted(s.items, key=lambda i: i.position)
    ]
    seconds = sum(i.duration_seconds for i in s.items if not i.optional)
    entry = JokesEntry(kind="jokes", id=f"{s.id}-jokes", pieces=pieces)
    return [BeatIn(id=f"{s.id}-beat", cue="Set", seconds=seconds, entries=[entry])]


def stored_beats(s: Setlist) -> list[BeatIn]:
    if s.beats is None:
        return legacy_beats(s)
    return [BeatIn.model_validate(b) for b in s.beats]


def piece_lists(beats: list[BeatIn]) -> Iterator[list[PieceIn]]:
    for beat in beats:
        for entry in beat.entries:
            if isinstance(entry, PremiseEntry | JokesEntry):
                yield entry.pieces


def shown(beats: list[BeatIn], jokes: Jokes) -> list[BeatIn]:
    """The beats as the app sees them: a cluster plays its lead (unless pinned), and jokes in the
    Trash or gone are left out. Gates are kept within what's left."""
    out = [b.model_copy(deep=True) for b in beats]
    for pieces in piece_lists(out):
        for p in pieces:
            lead = jokes.leads.get(p.cluster_id) if p.cluster_id and not p.pinned else None
            if lead and jokes.live(lead):
                p.joke_id = lead
        live = [jokes.live(p.joke_id) for p in pieces]
        for n, p in enumerate(pieces):  # a gate counts the jokes it guards that are shown
            p.gate = sum(live[n + 1 : n + 1 + p.gate]) if p.gate else 0
        pieces[:] = [p for p, shows in zip(pieces, live, strict=True) if shows]
        clamp(pieces)
    return out


def clamp(pieces: list[PieceIn]) -> None:
    """A gate can guard only the jokes after it."""
    for n, p in enumerate(pieces):
        p.gate = min(p.gate, len(pieces) - 1 - n)


def tidy(db: Session, user: User, beats: list[BeatIn]) -> list[BeatIn]:
    """Ready to store: premises and clusters deleted meanwhile are let go, jokes clustered since
    join their cluster, the first premise of a beat has no premise before it to be gated on, and
    gates fit their lists."""
    # A premise in the Trash keeps its place: put back, it's there again.
    mine = select(Premise.id).where(Premise.user_id == user.id)
    premises = set(db.scalars(mine.execution_options(**{INCLUDE_TRASHED: True})))
    clusters = set(db.scalars(select(JokeCluster.id).where(JokeCluster.user_id == user.id)))
    # A joke clustered after it went into the set follows its cluster from now on, pinned to
    # itself unless it's the lead, so the set still plays what was picked.
    jokes = {p.joke_id for pieces in piece_lists(beats) for p in pieces}
    rows = select(Joke.id, Joke.cluster_id).where(Joke.user_id == user.id, Joke.id.in_(jokes))
    cluster_of = dict(db.execute(rows.execution_options(**{INCLUDE_TRASHED: True})).tuples().all())
    leads = cluster_leads(db, user)
    out = [b.model_copy(deep=True) for b in beats]
    for beat in out:
        first = True
        for entry in beat.entries:
            if isinstance(entry, PremiseEntry):
                if entry.premise_id not in premises:
                    entry.premise_id = None
                entry.gate = entry.gate and not first
                first = False
    for pieces in piece_lists(out):
        for p in pieces:
            if p.cluster_id is not None and p.cluster_id not in clusters:
                p.cluster_id, p.pinned = None, False
            elif p.cluster_id is None and (joined := cluster_of.get(p.joke_id)) is not None:
                p.cluster_id, p.pinned = joined, leads.get(joined) != p.joke_id
        clamp(pieces)
    return out


def keep_hidden(old: list[BeatIn], new: list[BeatIn], hidden: set[uuid.UUID]) -> None:
    """Jokes in the Trash aren't sent by the app: put them back where they were, in the same
    list, so restoring a joke returns it to its place."""
    before = {
        e.id: e.pieces for b in old for e in b.entries if isinstance(e, PremiseEntry | JokesEntry)
    }
    for beat in new:
        for entry in beat.entries:
            if not isinstance(entry, PremiseEntry | JokesEntry):
                continue
            sent = {p.id for p in entry.pieces}
            was = before.get(entry.id, [])
            for n, p in enumerate(was):
                if p.joke_id in hidden and p.id not in sent:
                    entry.pieces.insert(min(n, len(entry.pieces)), p)
            widen(entry.pieces, sent, was)


def widen(pieces: list[PieceIn], sent: set[str], was: list[PieceIn]) -> None:
    """The app counts a gate over the jokes it shows. With hidden ones put back, a gate also
    guards those among its jokes, and those it guarded before at its end."""
    before = {p.id: {q.id for q in was[n + 1 : n + 1 + p.gate]} for n, p in enumerate(was)}
    for n, p in enumerate(pieces):
        old = before.get(p.id, set())
        # Gate 0 is shown for a gate whose jokes are all hidden: that one comes back too.
        if p.id not in sent or (not p.gate and (not old or old & sent)):
            continue
        left, span = p.gate, 0
        for q in pieces[n + 1 :]:
            if q.id in sent:
                if not left:
                    break
                left -= 1
            elif not left and q.id not in old:
                break
            span += 1
        p.gate = span


def joke_ids(beats: list[BeatIn]) -> set[uuid.UUID]:
    return {p.joke_id for pieces in piece_lists(beats) for p in pieces}


def items_from(beats: list[BeatIn]) -> list[SetlistItemIn]:
    """The set's jokes in running order, each once. Loose is stored as `optional`."""
    seen: set[uuid.UUID] = set()
    items = []
    for pieces in piece_lists(beats):
        for p in pieces:
            if p.joke_id not in seen:
                seen.add(p.joke_id)
                items.append(SetlistItemIn(joke_id=p.joke_id, optional=p.loose))
    return items


def beat_seconds(beats: list[BeatIn]) -> int:
    """How long the set runs: the beats' own times, added up."""
    return sum(b.seconds for b in beats)
