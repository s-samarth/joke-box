"""The tools Claude sees for the library and the stage: jokes, premises, the writing pulse, sets
and shows. Each one reads, never writes, except log_show, which only the set-review engine may
call (it needs the `shows` scope). Searching jokes and listing clusters are in server_jokes.py,
the notebook and study tools in server_notebook.py.

The work lives in the area modules; these wrappers give each tool its name, its description
(the docstring, which Claude reads to decide when to call it) and its database session.
"""

from typing import Any

from app.connector import library, performing, pulse
from app.connector.base import LOG, READ, server
from app.connector.identity import logging_shows, reading
from app.connector.log_show import log_show as save_logged_show
from app.connector.log_show import when


@server.tool(annotations=READ)
def jokebox_overview() -> dict[str, Any]:
    """What's in JokeBox: topics and subtopics with joke counts, how many premises, clusters,
    sets, shows and observations there are, the Craft areas, and the statuses and types in use."""
    with reading() as (db, user):
        return library.overview(db, user)


@server.tool(annotations=READ)
def writing_pulse() -> dict[str, Any]:
    """How the writing is going, worked out from what's saved (nothing is logged for it), the
    same as the Writing pulse on the comic's Activity screen. `where_everything_stands`:
    observations and premises by the four statuses they share, jokes by status in the comic's
    order. `how_far_ideas_got`: of what was written in the last 90 days, how many observations
    led to a joke, premise or brainstorm, premises got a joke, and jokes were marked Stage Ready;
    `narrowest_step` names the step fewest got through (null until a step has 5 in it).
    `month_on_month`: the last six months, each counted on what was written that month, with
    `still_settling` for months too recent to judge. `when_you_write`: the last 90 days by
    weekday and part of the day (null under 10 pieces). `sitting_idle`: counts over everything.
    `worth_knowing`: up to two plain sentences. Days are India's; `too_little_yet` means under
    five pieces in all."""
    with reading() as (db, user):
        return pulse.writing_pulse(db, user)


@server.tool(annotations=READ)
def get_jokes(ids: list[str]) -> dict[str, Any]:
    """Up to 20 jokes in full: setup, punchline, tag lines, notes, premise, the joke each one
    follows and the jokes that follow it, the sets it's in, how many rewrites it has, its
    record at logged shows (shows done, how many killed, ok or bombed, the date last done), the
    observations and voice notes it came from, and its cluster: the other versions of the same
    joke (each with whether it's the lead) when it's one of several."""
    with reading() as (db, user):
        return library.get_jokes(db, user, ids)


@server.tool(annotations=READ)
def list_premises(
    query: str = "", topic: str = "", status: str = "", min_strength: int = 1
) -> dict[str, Any]:
    """Premises: each one's take, topic and how many jokes rest on it. A joke from any topic
    can rest on any premise. `notes` say why the take is true and `extra_notes` hold anything
    else the comic kept on it (both shortened here). `status` is Draft, Work in Progress, Stage
    Ready or Discarded: the premise's own, apart from its jokes' (a Discarded premise's jokes
    are as they were). `strength` is 1 (Weak) to 5 (Killer), or null when not rated yet. Narrow
    by words in the take or either notes, by topic name, by status, or by a strength from
    min_strength up (which leaves out unrated ones)."""
    with reading() as (db, user):
        return library.list_premises(db, user, query, topic, status, min_strength)


@server.tool(annotations=READ)
def get_premise(premise_id: str) -> dict[str, Any]:
    """One premise: the take, its status and strength (as in list_premises), the full notes (why
    it's true) and extra_notes (anything else kept on it), the observations it came from, and
    every joke on it in chain order, so a joke that follows another comes right after it."""
    with reading() as (db, user):
        return library.get_premise(db, user, premise_id)


@server.tool(annotations=READ)
def list_sets() -> dict[str, Any]:
    """Sets, most recently changed first: the set's point, tags, rating, venue, target time,
    runtime (the beats' own times added up) and how many beats and jokes."""
    with reading() as (db, user):
        return performing.list_sets(db, user)


@server.tool(annotations=READ)
def get_set(set_id: str) -> dict[str, Any]:
    """A set as the comic builds it: beats in a fixed order, each with a cue, a description, its own
    time, labels (Status, Dominant persona side and the comic's other fields; Not sure if unset) and
    the reason for a status shift. A beat is an ordered list of premises with their jokes, jokes
    with no premise, and crowd work. A loose joke keeps its place but is flexible; a joke that
    guards N jokes is a gate: if it doesn't land, those are skipped. Then every joke in running
    order with its topic, premise, strength and time, and a count of jokes per topic."""
    with reading() as (db, user):
        return performing.get_set(db, user, set_id)


@server.tool(annotations=READ)
def list_shows(
    query: str = "", since: str = "", until: str = "", offset: int = 0, limit: int = 25
) -> dict[str, Any]:
    """Logged shows, newest first: show_id, performed_at, date, venue, minutes, audience, rating,
    LPM, topics and notes, plus the LPM across every show that matches. Narrow by words in
    the venue, topics or notes, and by date: `since` and `until` are dates like 2026-10-31 (IST,
    both included). At most 25 a call: when next_offset is set, call again with that offset
    for the rest. LPM scores each laugh 1-5 by how much of the room reacted (1 one or two
    people, 2 some, 3 most, 4 it rolls on or gets some clapping, 5 an applause break) and
    divides the points by minutes: 12+ is great,
    9+ decent, 6+ poor, below 6 rough. Each show lists the jokes done in running order, each
    with how it went (killed, ok, bombed, or null if not rated) and the comic's note on it;
    most shows list none. A show logged from a recording names the engine version in
    `reviewed_by`, and each joke also carries `suggested_result` (the engine's guess, beside
    the comic's `result`) and `laugh_points` (the points of the laughs credited to it); both
    are null on shows logged by hand."""
    with reading() as (db, user):
        return performing.list_shows(
            db, user, query, limit, since=since, until=until, offset=offset
        )


@server.tool(annotations=LOG)
def log_show(
    performed_at: str,
    venue: str,
    duration_seconds: int,
    rating: int,
    laughs: list[int],
    engine_version: str,
    events: list[dict[str, Any]],
    jokes: list[dict[str, Any]] | None = None,
    topics: list[str] | None = None,
    audience_size: int = 0,
    notes: str = "",
    learned: str = "",
    show_id: str = "",
) -> dict[str, Any]:
    """Log a show the comic reviewed with the set-review engine. Only that engine may call this;
    other connections get an error. `performed_at` is an ISO date and time (IST if no zone).
    `laughs` is five counts: laughs scored 1, 2, 3, 4 and 5 points. `jokes` in running order,
    each {joke_id, result, suggested_result, note}: result is the comic's (killed, ok, bombed or
    null) and suggested_result the engine's. `events` is the laugh timeline, each {start, end}
    in seconds, kind (laugh or applause), points 1-5 and the joke_id it's credited to or null.
    `topics` are the comic's topic names, as they gave them: one that matches none is refused
    with the list of topics. Without topics or jokes, a new show goes under Random and an
    existing one keeps its topics. Empty or omitted jokes keep the comic's entries.
    `notes` are remarks on the night. `learned` is what the comic learned, saved on
    the show beside them (empty keeps what's there). Pass `show_id` to replace a show logged
    before."""
    show: dict[str, Any] = {
        "performed_at": performed_at,
        "venue_name": venue,
        "topics": topics or [],
        "duration_seconds": duration_seconds,
        "audience_size": audience_size,
        "rating": rating,
        "notes": notes,
        "learned": learned,
        "laughs": laughs,
        "jokes": jokes,
        "engine_version": engine_version,
        "events": events,
    }
    with logging_shows() as (db, user):  # a bad date is a readable tool error, raised in here
        show["performed_at"] = when(performed_at)
        return save_logged_show(db, user, show_id, show)


# The rest of the tools register themselves on the same server when this loads.
from app.connector import server_jokes, server_notebook  # noqa: E402, F401
