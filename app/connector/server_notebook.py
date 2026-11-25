"""The tools Claude sees for the notebook and for study: observations, voice notes, brainstorms,
Craft notes and analyses. Each one reads, never writes. Loaded by server.py."""

from typing import Any

from mcp.server.mcpserver import Image
from mcp.types import TextContent

from app.connector import brainstorm, notebook, study, voice
from app.connector.base import READ, server
from app.connector.identity import reading


@server.tool(annotations=READ)
def search_observations(
    query: str = "",
    topic: str = "",
    kind: str = "",
    limit: int = 25,
    min_strength: int = 1,
    status: str = "",
    offset: int = 0,
) -> dict[str, Any]:
    """Observations: things the comic noticed that aren't jokes yet, newest first. `topic` is a
    joke topic (the same list as jokes and premises; Random unless filed elsewhere). `kind` says
    what sort of note it is, like "Set ideas" or "Questions"; most are plain "Observation".
    `extra_notes` is anything the comic added under it (often empty). Words match either.
    `premise_ids` and `joke_ids` are what came from it and `brainstorm_ids` the brainstorm
    sessions it was used in: all empty means it hasn't been used yet. `strength` is 1 (Weak) to
    5 (Killer), or null when not rated yet; min_strength leaves out weaker and unrated ones.
    `status` is Draft, Work in Progress, Stage Ready or Discarded, the same four as a premise's;
    narrow by it with `status`.
    At most 25 a call: when next_offset is set, call again with that offset for the rest."""
    with reading() as (db, user):
        return notebook.search_observations(
            db, user, query, topic, limit, kind, min_strength, status, offset
        )


@server.tool(annotations=READ)
def search_voice_notes(query: str = "", limit: int = 25, offset: int = 0) -> dict[str, Any]:
    """Voice notes: ideas the comic recorded out loud, newest first, by label and hashtags.
    Only what each is called and tagged, how long it runs, when it was recorded and `joke_ids`
    (the jokes written from it): the recordings themselves can't be heard here.
    At most 25 a call: when next_offset is set, call again with that offset for the rest."""
    with reading() as (db, user):
        return voice.search_voice_notes(db, user, query, limit, offset)


@server.tool(annotations=READ)
def search_brainstorms(query: str = "", limit: int = 25, offset: int = 0) -> dict[str, Any]:
    """Brainstorm sessions (free writing, maybe running a Craft technique) and Rewrites
    (reworking one joke), searched by title and typed text. Handwriting can't be searched: a
    brainstorm's handwritten_pages says how many pages it has; read them with get_brainstorm.
    At most 25 a call: when next_offset is set, call again with that offset for the rest."""
    with reading() as (db, user):
        return notebook.search_brainstorms(db, user, query, limit, offset)


@server.tool(annotations=READ)
def get_brainstorm(
    brainstorm_id: str, from_page: int = 1, from_char: int = 0
) -> list[TextContent | Image]:
    """One result of search_brainstorms in full, by its id. A Brainstorm session: title, typed
    text, technique, linked jokes and observations, then each handwritten page as an image,
    labelled "Page N". Read the handwriting from the images: the app's dark page in the comic's
    own ink colours, up to two screens wide. If more_from_page is set, call again with
    from_page for the rest. For either kind, follow more_from_char with from_char for the
    remaining typed text. Text continuations omit ink. A Rewrite includes the joke it reworks."""
    with reading() as (db, user):
        return brainstorm.get_brainstorm(db, user, brainstorm_id, from_page, from_char)


@server.tool(annotations=READ)
def search_craft(query: str = "", area: str = "", kind: str = "") -> dict[str, Any]:
    """Craft notes: the comic's own notes on how comedy works (premises, setups, techniques,
    stage craft). With no query, lists every title. Open notes with get_craft_notes."""
    with reading() as (db, user):
        return study.search_craft(db, user, query, area, kind)


@server.tool(annotations=READ)
def get_craft_notes(ids: list[str], from_char: int = 0) -> dict[str, Any]:
    """Up to 10 Craft notes in full. A body longer than 20,000 characters comes in parts:
    body_length is the whole note, and when more_from_char is set, call again with that note's
    id and from_char=more_from_char for the next part. Read every part before relying on a note."""
    with reading() as (db, user):
        return study.get_craft_notes(db, user, ids, from_char)


@server.tool(annotations=READ)
def search_analyses(query: str = "", limit: int = 25, offset: int = 0) -> dict[str, Any]:
    """The comic's analyses of other comics' sets and jokes, with the routine each is about.
    At most 25 a call: when next_offset is set, call again with that offset for the rest."""
    with reading() as (db, user):
        return study.search_analyses(db, user, query, limit, offset)


@server.tool(annotations=READ)
def get_analysis(analysis_id: str, from_char: int = 0) -> dict[str, Any]:
    """One analysis in full. A body longer than 20,000 characters comes in parts: when
    more_from_char is set, call again with from_char=more_from_char for the next part."""
    with reading() as (db, user):
        return study.get_analysis(db, user, analysis_id, from_char)
