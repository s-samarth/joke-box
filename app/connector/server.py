"""The MCP server: the tools Claude sees. Each one reads, never writes.

The work lives in the area modules; these wrappers give each tool its name, its description
(the docstring, which Claude reads to decide when to call it) and its database session.
"""

from typing import Any

from mcp.server.mcpserver import Image, MCPServer
from mcp.types import TextContent, ToolAnnotations

from app.connector import brainstorm, library, notebook, performing, study, voice
from app.connector.identity import reading

INSTRUCTIONS = """JokeBox is a stand-up comic's library: jokes (setup, punchline, tags) filed by \
topic, premises (a take with a reason) that jokes rest on, sets in running order, logged shows, \
observations, voice notes, brainstorms, Craft notes on how comedy works, and analyses of other \
comics.
Start with jokebox_overview if you don't know what's there. Search first, then open the few \
items you need. Quote Craft notes by title when you apply them. Handwritten brainstorms come as \
images of their pages from get_brainstorm: read the handwriting from them. Everything here is \
read-only: the comic writes and edits in JokeBox themselves."""

# No subscriptions: the tool list never changes while running, and a listen request is a
# stream that a stateless JSON server never answers, so each one held a function open until
# Vercel's 300-second timeout and Claude opened another.
server = MCPServer("JokeBox", instructions=INSTRUCTIONS, subscriptions=False)
READ = ToolAnnotations(read_only_hint=True, open_world_hint=False)


@server.tool(annotations=READ)
def jokebox_overview() -> dict[str, Any]:
    """What's in JokeBox: topics and subtopics with joke counts, how many premises, sets, shows
    and observations there are, the Craft areas, and the statuses and types in use."""
    with reading() as (db, user):
        return library.overview(db, user)


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
    (topic, subtopic, status, type), a strength from 1 to 5 and up, or a premise id. Returns
    short versions (at most 25) and the total; open them with get_jokes."""
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
    follows and the jokes that follow it, the sets it's in, how many rewrites it has, and its
    record at logged shows (shows done, how many killed, ok or bombed, the date last done)."""
    with reading() as (db, user):
        return library.get_jokes(db, user, ids)


@server.tool(annotations=READ)
def list_premises(query: str = "", topic: str = "") -> dict[str, Any]:
    """Premises: each one's take, topic and how many jokes rest on it. A joke from any topic
    can rest on any premise. Narrow by words in the take or notes, or by topic name."""
    with reading() as (db, user):
        return library.list_premises(db, user, query, topic)


@server.tool(annotations=READ)
def get_premise(premise_id: str) -> dict[str, Any]:
    """One premise: the take, the full notes (why it's true), and every joke on it in chain
    order, so a joke that follows another comes right after it."""
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


@server.tool(annotations=READ)
def search_observations(query: str = "", topic: str = "", limit: int = 25) -> dict[str, Any]:
    """Observations: things the comic noticed that aren't jokes yet, newest first. Their topics
    are separate from joke topics."""
    with reading() as (db, user):
        return notebook.search_observations(db, user, query, topic, limit)


@server.tool(annotations=READ)
def search_voice_notes(query: str = "", limit: int = 25) -> dict[str, Any]:
    """Voice notes: ideas the comic recorded out loud, newest first, by label and hashtags.
    Only what each is called and tagged, how long it runs and when it was recorded: the
    recordings themselves can't be heard here."""
    with reading() as (db, user):
        return voice.search_voice_notes(db, user, query, limit)


@server.tool(annotations=READ)
def search_brainstorms(query: str = "", limit: int = 25) -> dict[str, Any]:
    """Brainstorm sessions (free writing, maybe running a Craft technique) and Rewrites
    (reworking one joke), searched by title and typed text. Handwriting can't be searched: a
    brainstorm's handwritten_pages says how many pages it has; read them with get_brainstorm."""
    with reading() as (db, user):
        return notebook.search_brainstorms(db, user, query, limit)


@server.tool(annotations=READ)
def get_brainstorm(brainstorm_id: str, from_page: int = 1) -> list[TextContent | Image]:
    """One result of search_brainstorms in full, by its id. A Brainstorm session: title, typed
    text, technique, linked jokes and observations, then each handwritten page as an image,
    labelled "Page N". Read the handwriting from the images: the app's dark page in the comic's
    own ink colours, up to two screens wide. If more_from_page is set, call again with
    from_page for the rest. A Rewrite (kind "rewrite"): the joke it reworks and the typed text."""
    with reading() as (db, user):
        return brainstorm.get_brainstorm(db, user, brainstorm_id, from_page)


@server.tool(annotations=READ)
def search_craft(query: str = "", area: str = "", kind: str = "") -> dict[str, Any]:
    """Craft notes: the comic's own notes on how comedy works (premises, setups, techniques,
    stage craft). With no query, lists every title. Open notes with get_craft_notes."""
    with reading() as (db, user):
        return study.search_craft(db, user, query, area, kind)


@server.tool(annotations=READ)
def get_craft_notes(ids: list[str]) -> dict[str, Any]:
    """Up to 10 Craft notes in full."""
    with reading() as (db, user):
        return study.get_craft_notes(db, user, ids)


@server.tool(annotations=READ)
def search_analyses(query: str = "", limit: int = 25) -> dict[str, Any]:
    """The comic's analyses of other comics' sets and jokes, with the routine each is about."""
    with reading() as (db, user):
        return study.search_analyses(db, user, query, limit)


@server.tool(annotations=READ)
def get_analysis(analysis_id: str) -> dict[str, Any]:
    """One analysis in full."""
    with reading() as (db, user):
        return study.get_analysis(db, user, analysis_id)
