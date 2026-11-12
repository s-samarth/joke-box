"""The tools Claude sees for the library and the stage: jokes, premises, the writing pulse, sets
and shows. Each one reads, never writes. The notebook and study tools are in server_notebook.py.

The work lives in the area modules; these wrappers give each tool its name, its description
(the docstring, which Claude reads to decide when to call it) and its database session.
"""

from typing import Any

from app.connector import library, performing, pulse
from app.connector.base import READ, server
from app.connector.identity import reading


@server.tool(annotations=READ)
def jokebox_overview() -> dict[str, Any]:
    """What's in JokeBox: topics and subtopics with joke counts, how many premises, sets, shows
    and observations there are, the Craft areas, and the statuses and types in use."""
    with reading() as (db, user):
        return library.overview(db, user)


@server.tool(annotations=READ)
def writing_pulse() -> dict[str, Any]:
    """How the writing is going, worked out from what's saved (nothing is logged for it), the
    same as the Writing pulse on the comic's Daily activity screen. `written`: observations,
    premises and jokes written in the last 30 days and in the 30 before. `how_far_ideas_got`: of
    what was written in the last 90 days, how many observations led to a joke, premise or
    brainstorm, premises got a joke, and jokes got a punchline or were marked Stage Ready or
    Complete. `sitting_idle`: counts over everything, whatever its age. `worth_knowing`: up to
    three plain sentences. Days are India's; `too_little_yet` means under five pieces in all."""
    with reading() as (db, user):
        return pulse.writing_pulse(db, user)


@server.tool(annotations=READ)
def search_jokes(
    query: str = "",
    topic: str = "",
    subtopic: str = "",
    status: str = "",
    joke_type: str = "",
    min_strength: int = 1,
    premise_id: str = "",
    limit: int = 25,
) -> dict[str, Any]:
    """Find jokes. Every word of `query` must appear in the setup, punchline, tag lines,
    hashtags or notes; a word starting with # finds that hashtag. Filters are exact names
    (topic, subtopic, status, type), a strength from 1 to 5 and up, or a premise id. Strength is
    1 (Weak) to 5 (Killer), or null when the comic hasn't rated the joke yet; a min_strength
    above 1 leaves unrated jokes out. Returns short versions (at most 25) and the total; open
    them with get_jokes."""
    with reading() as (db, user):
        return library.search_jokes(
            db,
            user,
            query,
            topic,
            status,
            joke_type,
            min_strength,
            premise_id,
            limit,
            subtopic=subtopic,
        )


@server.tool(annotations=READ)
def get_jokes(ids: list[str]) -> dict[str, Any]:
    """Up to 20 jokes in full: setup, punchline, tag lines, notes, premise, the joke each one
    follows and the jokes that follow it, the sets it's in, how many rewrites it has, its
    record at logged shows (shows done, how many killed, ok or bombed, the date last done), and
    the observations and voice notes it came from."""
    with reading() as (db, user):
        return library.get_jokes(db, user, ids)


@server.tool(annotations=READ)
def list_premises(query: str = "", topic: str = "") -> dict[str, Any]:
    """Premises: each one's take, topic and how many jokes rest on it. A joke from any topic
    can rest on any premise. `notes` say why the take is true and `extra_notes` hold anything
    else the comic kept on it (both shortened here). Narrow by words in the take or either
    notes, or by topic name."""
    with reading() as (db, user):
        return library.list_premises(db, user, query, topic)


@server.tool(annotations=READ)
def get_premise(premise_id: str) -> dict[str, Any]:
    """One premise: the take, the full notes (why it's true) and extra_notes (anything else kept
    on it), the observations it came from, and every joke on it in chain order, so a joke that
    follows another comes right after it."""
    with reading() as (db, user):
        return library.get_premise(db, user, premise_id)


@server.tool(annotations=READ)
def list_sets() -> dict[str, Any]:
    """Sets, most recently changed first: tags, rating, venue, target time, runtime (optional
    jokes don't count) and how many jokes."""
    with reading() as (db, user):
        return performing.list_sets(db, user)


@server.tool(annotations=READ)
def get_set(set_id: str) -> dict[str, Any]:
    """A set in running order. The first joke is the opener and the last the closer; optional
    jokes are the ones to cut if time is short. Each joke comes with its topic, premise,
    strength and time, plus a count of jokes per topic in the set."""
    with reading() as (db, user):
        return performing.get_set(db, user, set_id)


@server.tool(annotations=READ)
def list_shows(
    query: str = "", since: str = "", until: str = "", offset: int = 0, limit: int = 25
) -> dict[str, Any]:
    """Logged shows, newest first: date, venue, minutes, audience, rating (1-5), LPM, the topics
    done and the comic's notes, plus the LPM across every show that matches. Narrow by words in
    the venue, topics or notes, and by date: `since` and `until` are dates like 2026-10-31 (IST,
    both included). At most 25 a call: when next_offset is set, call again with that offset
    for the rest. LPM scores each laugh 1-5 and divides the points by minutes: 12+ is great,
    9+ decent, 6+ poor, below 6 rough. Each show lists the jokes done in running order, each
    with how it went (killed, ok, bombed, or null if not rated) and the comic's note on it;
    most shows list none."""
    with reading() as (db, user):
        return performing.list_shows(
            db, user, query, limit, since=since, until=until, offset=offset
        )


# The rest of the tools register themselves on the same server when this loads.
from app.connector import server_notebook  # noqa: E402, F401
