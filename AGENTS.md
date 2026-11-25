# Working on JokeBox

Instructions for coding agents (Claude Code reads this through `CLAUDE.md`). The full
conventions are in [docs/development.md](docs/development.md); these are the ones most often
missed. [docs/README.md](docs/README.md) lists every doc.

| Working on | Read first |
|---|---|
| Screens and flows | [docs/screens.md](docs/screens.md), [docs/screens-perform.md](docs/screens-perform.md), [docs/user-flows.md](docs/user-flows.md) |
| Sets (beats, gates, labels, checks) | [docs/sets.md](docs/sets.md): what each part means and why |
| Models, migrations | [docs/data-model.md](docs/data-model.md) |
| API, the Claude connector | [docs/api.md](docs/api.md) |
| Shows logged from recordings, the laugh scale | [docs/set-review.md](docs/set-review.md) |
| The web app | [docs/frontend.md](docs/frontend.md), [docs/design-system.md](docs/design-system.md) |
| Why it's built this way | [docs/architecture.md](docs/architecture.md) |

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

## The live site (jokebox.samarthsaraswat.com)

It runs on Vercel's free Hobby plan, and the comic uses it every day.

- **Never poll it.** No curl loops, watch scripts or repeated requests to check a deploy or an
  endpoint. On 19 Nov 2026 a loop of about 200 requests in 10 minutes tripped Vercel's bot
  checkpoint (`403`, `x-vercel-mitigated: challenge`) for the whole IP: the comic's own browser
  showed "Can't reach JokeBox" until it passed the check. To see a deploy, look once: one request,
  one page load, or the Vercel dashboard.
- **Spend the monthly allowance carefully.** On Hobby, a limit that runs out stops that feature
  for up to 30 days. Active CPU (4 hours a month; every API and connector call) and Blob simple
  operations (10,000; voice notes) run closest. Bulk edits through the API: fetch a list once,
  then write only what changed.
- **Never try to get past the checkpoint.** If it appears, ask the comic to open the site in a
  normal tab, or wait for it to lift. See [the runbook](docs/development.md#operations-runbook).

## The Claude connector (`app/connector/`)

Claude reads JokeBox through an MCP server at `/mcp`: 18 read-only tools over jokes, clusters,
premises, sets, shows, observations, voice notes, brainstorms, Craft notes, analyses and the writing pulse,
plus `log_show`, which set-review uses to log a reviewed show. The tools read the models
directly, so a model change can break them, and Claude only finds out mid-conversation.

- **Change a model, check the connector in the same change.** Renaming, moving or removing a
  field on `Joke`, `Premise`, `Setlist`, `PerformanceLog`, `Observation`, `VoiceNote`, `WritingSession`,
  `Brainstorm`, `CraftNote`, `Analysis`, `ShowReview`, `JokeCluster` or their topics means updating `app/connector/`.
- **`tests/test_connector_contract.py` must pass.** It runs every tool over the demo data plus
  one of everything and checks each returns exactly its listed fields. A new tool must be added
  there too.
- **Changing a tool's output on purpose?** Update the contract test and the tool table in
  `docs/api.md` together. The comedy-writer skill relies on those field names.
- **A cluster's lead is worked out twice:** on the server (`app/services/clusters.py`, which
  stores it) and in the browser (`web/src/features/jokes/cluster/lead.ts`, so the list is right
  offline). Change the rule in both, with `tests/test_clusters.py` and `lead.test.ts`.
- **A set's beats are read twice:** on the server (`app/services/set_beats.py`, which works
  out `items`, cluster leads and the Trash) and in the browser (`web/src/features/sets/beats.ts`).
  The default label fields are in both `app/services/set_fields.py` and `web/src/api/setFields.ts`.
  Change them together, with `tests/test_set_beats.py` and `beats.test.ts`, and keep
  `docs/sets.md` and the in-app guide (`SetGuide.tsx`) saying the same thing.
- **The writing pulse is worked out twice:** in the browser for the Activity screen
  (`web/src/features/daily/pulse.ts`, `pulseTrends.ts`, `pulseNotes.ts`) and in `app/connector/`
  for Claude (`pulse.py`, `pulse_rows.py`, `pulse_trends.py`, `pulse_notes.py`).
  Change a rule in both, with the matching cases in `pulse.test.ts` and `tests/test_connector_pulse.py`.
- **Tools only read, except `log_show`.** It writes shows (with what was learned there, from
  `learned`, saved on the show), and only for a sign-in with the
  `shows` scope, which only set-review (the comic's review engine, `~/Codebases/set-review`) asks
  for. Each tool sees only the signed-in user's rows. Its fields are what set-review sends: change
  them together with `set_review/payload.py`.
- **Sign-in is OAuth** (`oauth.py`, `tokens.py`, `consent.py`). Deployed, the MCP SDK's host
  check must stay explicitly off in `http.py`: left unset, it refuses the real domain.
