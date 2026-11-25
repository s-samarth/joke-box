"""Saving a set and showing it to the app. The router in routers/shows.py is a thin layer over
this; the beat rules themselves are in services/set_beats.py."""

import uuid

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.deps import find_owned
from app.models import Joke, Setlist, SetlistItem, SetTag, User
from app.schemas.set_beats import BeatIn
from app.schemas.shows import SetlistIn, SetlistItemIn, SetlistItemOut, SetlistOut
from app.services.clashes import check_set
from app.services.set_beats import (
    Jokes,
    cluster_leads,
    items_from,
    joke_ids,
    keep_hidden,
    shown,
    stored_beats,
    tidy,
)
from app.services.show_logs import venue_named
from app.services.trash import trashed_joke_ids


def check_jokes_owned(db: Session, ids: set[uuid.UUID], user: User) -> None:
    found = db.scalar(select(func.count()).where(Joke.id.in_(ids), Joke.user_id == user.id))
    if found != len(ids):
        raise HTTPException(422, "Unknown joke in request")


def your_jokes(db: Session, user: User) -> Jokes:
    """Each joke's runtime (a set shows a joke as it is now), what's in the Trash, and each
    cluster's lead."""
    rows = db.execute(select(Joke.id, Joke.duration_seconds).where(Joke.user_id == user.id))
    runtimes = {joke_id: seconds for joke_id, seconds in rows}
    return Jokes(trashed_joke_ids(db, user), runtimes, cluster_leads(db, user))


def item_out(item: SetlistItem, jokes: Jokes) -> SetlistItemOut:
    """One place in a set, timed by its joke's current runtime."""
    out = SetlistItemOut.model_validate(item)
    out.duration_seconds = jokes.runtimes.get(item.joke_id, item.duration_seconds)
    return out


def items_out(s: Setlist, beats: list[BeatIn], jokes: Jokes) -> list[SetlistItemOut]:
    """The set's jokes in running order. A set with beats lists what its beats play now (a
    cluster's lead as it is today); one from before beats, its stored items."""
    if s.beats is None:
        return [item_out(i, jokes) for i in s.items if i.joke_id not in jokes.hidden]
    return [
        SetlistItemOut(
            joke_id=i.joke_id,
            position=n,
            duration_seconds=jokes.runtimes.get(i.joke_id, 0),
            optional=i.optional,
        )
        for n, i in enumerate(items_from(beats))
    ]


def setlist_out(s: Setlist, jokes: Jokes) -> SetlistOut:
    """A set as the app sees it: jokes in the Trash are left out until they come back."""
    beats = shown(stored_beats(s), jokes)
    return SetlistOut(
        id=s.id,
        name=s.name,
        show_date=s.show_date,
        target_seconds=s.target_seconds,
        venue_name=s.venue.name if s.venue else None,
        rating=s.rating,
        tag_ids=[t.id for t in s.tags],
        items=items_out(s, beats, jokes),
        point=s.point or "",
        status=s.status or "Draft",
        beats=beats,
        version=s.version,
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


def legacy_items(setlist: Setlist, body: SetlistIn, hidden: set[uuid.UUID]) -> list[SetlistItemIn]:
    """A save from an app older than beats, for a set that has none: its items as sent. Jokes in
    the Trash aren't sent by the app, so they keep their places for when they come back."""
    items = [i for i in body.items if i.joke_id not in hidden]
    for away in sorted(setlist.items, key=lambda i: i.position):
        if away.joke_id in hidden:
            kept = SetlistItemIn.model_validate(away, from_attributes=True)
            items.insert(min(away.position, len(items)), kept)
    return items


def old_build_edit(found: Setlist, body: SetlistIn, jokes: Jokes) -> None:
    """An app from before beats can't change a beats set's jokes: refused, rather than its
    change dropped with a 200. Its other details (name, venue, date) still save."""
    now = [(i.joke_id, i.optional) for i in setlist_out(found, jokes).items]
    sent = [(i.joke_id, i.optional) for i in body.items]
    if sent and sent != now:  # no items at all reads as "not about the jokes" (an import, say)
        raise HTTPException(409, "This set has beats now. Reload the app to change its jokes.")


def save_set(db: Session, user: User, setlist_id: uuid.UUID, body: SetlistIn) -> SetlistOut:
    """Create or replace a set, its beats and its items in one transaction."""
    jokes = your_jokes(db, user)
    hidden = jokes.hidden
    # A set saved offline may still list a joke deleted since on another device: it keeps its
    # place, hidden like any joke in the Trash.
    if body.beats is not None:
        check_jokes_owned(db, joke_ids(body.beats) - hidden, user)
    else:
        check_jokes_owned(db, {i.joke_id for i in body.items} - hidden, user)
    venue = venue_named(db, user, body.venue_name) if body.venue_name else None
    found = find_owned(db, Setlist, setlist_id, user)
    if found is not None and body.beats is None and found.beats is not None:
        old_build_edit(found, body, jokes)
    if found is not None:
        check_set(found, body, lambda: setlist_out(found, jokes))
    setlist = found or Setlist(id=setlist_id, user_id=user.id)
    if body.beats is not None:
        beats = tidy(db, user, body.beats)
        keep_hidden(stored_beats(setlist) if found else [], beats, hidden)
        setlist.beats = [b.model_dump(mode="json") for b in beats]
    # An older app sends no beats: the beats there are stay, and the items follow them.
    items = items_from(stored_beats(setlist)) if setlist.beats is not None else None
    if items is None:
        items = legacy_items(setlist, body, hidden)
    # A joke erased for good can still sit in stored beats (they aren't rewritten when it goes):
    # it has no row left to point at, so it isn't stored as an item.
    items = [i for i in items if i.joke_id in jokes.runtimes or i.joke_id in hidden]
    setlist.name = body.name
    setlist.show_date = body.show_date
    setlist.target_seconds = body.target_seconds
    setlist.venue = venue
    setlist.rating = body.rating
    if body.point is not None:
        setlist.point = body.point
    if body.status is not None:
        setlist.status = body.status
    # Only your tags that still exist: one deleted while a save waited (offline, or with the set
    # open) just drops off, rather than failing the save.
    mine = select(SetTag).where(SetTag.id.in_(body.tag_ids), SetTag.user_id == user.id)
    setlist.tags = list(db.scalars(mine))
    db.add(setlist)
    setlist.items = [SetlistItem(position=n, **item.model_dump()) for n, item in enumerate(items)]
    db.commit()
    db.refresh(setlist)
    return setlist_out(setlist, your_jokes(db, user))
