"""The MCP server: the tools Claude sees. Each one reads, never writes.

The work lives in the area modules; these wrappers give each tool its name, its description
(the docstring, which Claude reads to decide when to call it) and its database session.
"""

from typing import Any

from mcp.server.mcpserver import MCPServer
from mcp.types import ToolAnnotations

from app.connector import library, notebook, performing, study
from app.connector.identity import reading

INSTRUCTIONS = """JokeBox is a stand-up comic's library: jokes (setup, punchline, tags) filed by \
topic, premises (a take with a reason) that jokes rest on, sets in running order, logged shows, \
observations, brainstorms, Craft notes on how comedy works, and analyses of other comics.
Start with jokebox_overview if you don't know what's there. Search first, then open the few \
items you need. Quote Craft notes by title when you apply them. Everything here is read-only: \
the comic writes and edits in JokeBox themselves."""

server = MCPServer("JokeBox", instructions=INSTRUCTIONS)
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
    status: str = "",
    joke_type: str = "",
    min_strength: int = 1,
    premise_id: str = "",
    limit: int = 25,
) -> dict[str, Any]:
    """Find jokes. Every word of `query` must appear in the setup, punchline, tags or notes.
    Filters are exact names (topic, status, type), a strength from 1 to 5 and up, or a premise
    id. Returns short versions (at most 25) and the total; open them with get_jokes."""
    with reading() as (db, user):
        return library.search_jokes(
            db, user, query, topic, status, joke_type, min_strength, premise_id, limit
        )


@server.tool(annotations=READ)
def get_jokes(ids: list[str]) -> dict[str, Any]:
    """Up to 20 jokes in full: setup, punchline, tag lines, notes, premise, the joke each one
    follows and the jokes that follow it, the sets it's in, and how many rewrites it has."""
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
def list_shows(query: str = "", limit: int = 25) -> dict[str, Any]:
    """Logged shows, newest first: date, venue, minutes, audience, rating (1-5), LPM, the topics
    done and the comic's notes, plus the LPM across all shows. LPM scores each laugh 1-5 and
    divides the points by minutes: 12+ is great, 9+ decent, 6+ poor, below 6 rough. Shows
    record topics, not which jokes were done."""
    with reading() as (db, user):
        return performing.list_shows(db, user, query, limit)


@server.tool(annotations=READ)
def search_observations(query: str = "", topic: str = "", limit: int = 25) -> dict[str, Any]:
    """Observations: things the comic noticed that aren't jokes yet, newest first. Their topics
    are separate from joke topics."""
    with reading() as (db, user):
        return notebook.search_observations(db, user, query, topic, limit)


@server.tool(annotations=READ)
def search_brainstorms(query: str = "", limit: int = 25) -> dict[str, Any]:
    """Typed text from Brainstorm sessions (free writing, maybe running a Craft technique) and
    from Rewrites (reworking one joke). Handwriting isn't included."""
    with reading() as (db, user):
        return notebook.search_brainstorms(db, user, query, limit)


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
