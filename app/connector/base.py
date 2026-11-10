"""The MCP server itself: its name, what it tells Claude about JokeBox, and the mark every tool
carries. The tools are registered on it in server.py and server_notebook.py."""

from mcp.server.mcpserver import MCPServer
from mcp.types import ToolAnnotations

INSTRUCTIONS = """JokeBox is a stand-up comic's library: jokes (setup, punchline, tags) filed by \
topic, premises (a take with a reason) that jokes rest on, sets in running order, logged shows, \
observations, voice notes, brainstorms, Craft notes on how comedy works, and analyses of other \
comics.
Start with jokebox_overview if you don't know what's there. Search first, then open the few \
items you need. Quote Craft notes by title when you apply them. Handwritten brainstorms come as \
images of their pages from get_brainstorm: read the handwriting from them. writing_pulse says how \
the writing itself is going: the pace, how far ideas get, and what's sitting idle. Everything \
here is read-only: the comic writes and edits in JokeBox themselves."""

# No subscriptions: the tool list never changes while running, and a listen request is a
# stream that a stateless JSON server never answers, so each one held a function open until
# Vercel's 300-second timeout and Claude opened another.
server = MCPServer("JokeBox", instructions=INSTRUCTIONS, subscriptions=False)
READ = ToolAnnotations(read_only_hint=True, open_world_hint=False)
