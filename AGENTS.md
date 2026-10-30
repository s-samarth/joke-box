# Working on JokeBox

Instructions for coding agents (Claude Code reads this through `CLAUDE.md`). The full
conventions are in [docs/development.md](docs/development.md); these are the ones most often
missed.

## Checks after every change

```bash
uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest
cd web && npx tsc -b && npx oxlint --deny-warnings src && npx vitest run
```

## Rules

- Files stay under 200 lines. Migrations are append-only: fix forward with a new revision.
- Every query is scoped to the signed-in user, and the Trash stays hidden from lists.
- No real jokes or material in seeds, fixtures, tests or screenshots: use made-up material.
- Ask before adding a dependency, and commit the lockfile with it.

## The Claude connector (`app/connector/`)

Claude reads JokeBox through an MCP server at `/mcp`: 14 read-only tools over jokes, premises,
sets, shows, observations, brainstorms, Craft notes and analyses. The tools read the models
directly, so a model change can break them, and Claude only finds out mid-conversation.

- **Change a model, check the connector in the same change.** Renaming, moving or removing a
  field on `Joke`, `Premise`, `Setlist`, `PerformanceLog`, `Observation`, `WritingSession`,
  `Brainstorm`, `CraftNote`, `Analysis` or their topics means updating `app/connector/`.
- **`tests/test_connector_contract.py` must pass.** It runs every tool over the demo data plus
  one of everything and checks each returns exactly its listed fields. A new tool must be added
  there too.
- **Changing a tool's output on purpose?** Update the contract test and the tool table in
  `docs/api.md` together. The comedy-writer skill relies on those field names.
- **Tools only read.** No tool writes, and each sees only the signed-in user's rows.
- **Sign-in is OAuth** (`oauth.py`, `tokens.py`, `consent.py`). Deployed, the MCP SDK's host
  check must stay explicitly off in `http.py`: left unset, it refuses the real domain.
