# Development and operations

## Prerequisites

- Python 3.12 and [uv](https://docs.astral.sh/uv/)
- Node 22 and npm
- Optional: ffmpeg (handy for making test audio)

## Run it locally

```bash
uv sync && npm --prefix web install
uv run alembic upgrade head
uv run python -m app.seed dev@example.com   # optional: the demo data
```

Then, in two terminals:

```bash
uv run uvicorn app.main:app --reload --port 8000
npm --prefix web run dev
```

Open http://localhost:5173 and choose **Sign in as the local test account**. Vite proxies
`/api`, `/auth` and `/health` to port 8000.

- **No `.env` is needed.** Locally the app uses `./jokebox.db` (SQLite), and voice notes go to
  `./.voice-notes/`. Copy [.env.example](../.env.example) to `.env` to try Google sign-in locally.
- **Reset to demo data** is in the avatar menu (local only).
- **API docs** are at http://localhost:8000/api/docs.
- **To try a production build on one port:** `npm --prefix web run build`, then run uvicorn alone.
  FastAPI serves `web/dist` and falls back to `index.html`.

## Checks (run after every change)

```bash
uv run ruff check . && uv run ruff format --check . && uv run mypy app && uv run pytest
```

```bash
npm --prefix web run typecheck && npm --prefix web run lint && npm --prefix web test
```

CI runs the same checks, plus the migrations on Postgres 16 and a production build
([ci.yml](../.github/workflows/ci.yml)). Locally, the tests use a fresh SQLite database; set
`TEST_DATABASE_URL` to run them against Postgres.

| Suite | Where | Covers |
|---|---|---|
| pytest | `tests/` | Auth and allowlist (checked on every request), CSRF header, user isolation on every resource, topic and type transactions, setlist ownership, deleting and merging venues, UTC round trips, offline written-at times, version clashes on jokes, sets, sessions, Craft notes, observations and premises (and saves that change nothing keeping their version), voice upload limits, the Trash (put back, sets, rewrites, 30 days, erasing), set ratings, tags and optional jokes, the order of topics, subtopics and observation kinds, observations under a joke topic and a kind (saves from apps made before kinds), what came from an observation (linking twice, versions untouched, the Trash left out for Claude), the voice notes behind a joke (kept when a save leaves them out, a recording not uploaded yet, what Claude sees) and the brainstorms an observation was used in, the importer, the watchlist, craft notes, areas and kinds, type colours, joke chains (branches, loops, older apps, the Trash), unrated jokes (new ones start unrated; a save without strength keeps it), premises (and putting a trashed one back with its jokes), the jokes done at a show and their results, field lengths and limits, packed bodies only for signed-in saves, the seed's guard against a remote database, the nightly backup's Blob download, old field names in saves from before jokes were renamed, and the Claude connector (OAuth, every tool's fields, the transport) |
| Vitest | `web/src/**/*.test.ts` | Durations and IST dates, lists by month, set timing (optional jokes too), picking several sets for a show, show filters and weighted rating, show insights and the timeline, ink geometry, voice format choice, the loudness curve, watchlist helpers, import bundles, observation filters and labels, every `hit` tap area having a position of its own, every menu panel capped to the room on screen, the craft note format (tables, callouts, flows) and its editing (toolbar changes, list keys, tables as boxes, changing one block), LPM and the path, the daily joke streak and calendar, daily activity (each day split three ways in IST, a month added up to today, how bright a day is), which failed saves retry, the shipped save keys, the Couldn't sync summaries, upload time limits, honest save messages, reordering a cached list, type colour picks, joke chains and what a set brings with a joke, the joke map layout (chains, branches, dimmed jokes outside the filters, loops), unrated jokes in labels and sorting, saves from before jokes were renamed, crash recovery (spotting an old copy, repairing once, keeping waiting saves), one waiting copy per brainstorm session, packed saves and answers, keeping sessions on the device, pen sizes, zooming a page, the draw-with-finger setting, full screen, flick scrolling and telling a two-finger scroll from a pinch, kept New joke drafts, launching without waiting for old saves, saving when the app is hidden, joke saves based on the version the editor opened, clashes going to Couldn't sync with Keep mine (sets, Craft notes, observations, premises) and session clashes kept as a copy, session size limits, the one-tab handover, search across everything, the ZIP writer behind Download everything, and the jokes done at a show |

## Conventions

- **Files stay under 200 lines.** Split a screen into small components in its `features/<area>/`
  folder.
- **Python:** type hints everywhere (mypy strict), docstrings, small single-purpose functions.
  Multi-row changes go in `app/services/` and run in one transaction.
- **TypeScript:** strict mode, functional components, Tailwind classes, ES modules. Server data
  goes through TanStack Query hooks in `web/src/api/`, never `useState`.
- **Every query is scoped to the user.** Use `get_owned` / `find_owned` and filter by `user_id`.
  Add a test showing another user gets a 404.
- **Reuse before you add.** Check `components/ui/` and `lib/` first.
- **One topic list for jokes, premises and observations.** They all read `useTopics()` (one
  `['topics']` cache) and add topics through `useNewTopic`, so a topic made anywhere shows up
  everywhere. A topic change refetches all three (`useRefreshLibrary` in `api/library.ts`),
  because deleting a topic moves all three to Random on the server; anything new filed under
  topics joins that list, the server's `delete_topic` and the topic manager's counts.
- **Write the copy** by the rules in [design-system.md](design-system.md#words-in-the-app).
- **No real jokes** in seeds, fixtures, tests or screenshots. Use obviously made-up material, like
  the demo set.
- **Ask before adding a dependency,** and commit the lockfile with it.
- **Keep the Claude connector in step with the models.** [app/connector/](../app/connector/)
  reads jokes, premises, sets, shows, observations, brainstorms, Craft notes and analyses
  directly. When you rename, move or remove a field on any of them, update the connector in the
  same change. Three things catch a miss: mypy (the connector is typed against the models),
  [test_connector_contract.py](../tests/test_connector_contract.py) (every tool, run over the
  demo data plus one of everything, must succeed and return exactly its listed fields), and the
  per-tool tests. If a tool's output changes on purpose, update the contract test and the tool
  table in [api.md](api.md#claude-connector-mcp) together: Claude, and the comedy-writer skill,
  rely on those field names.

## Git workflow

```bash
git fetch && git switch -c feat/<name> --no-track origin/main
```

- Prefix branches `feat/`, `fix/`, `docs/` or `exp/`. Never commit to `main`.
- Write conventional commits (`feat(web): …`, `fix: …`, `docs: …`).
- Push and open a PR with `gh pr create`, saying what changed, why, and how it was tested. Squash
  merge once CI is green.
- To catch up with main, use `git fetch && git merge origin/main`. Never rebase a pushed branch.

## Database migrations

```bash
uv run alembic revision --autogenerate -m "short description"
uv run alembic upgrade head
uv run alembic downgrade -1 && uv run alembic upgrade head   # prove downgrade works
```

- Migrations are **append-only** once merged. CI rejects edits to existing ones.
- Write them to work on both SQLite and Postgres: use `batch_alter_table` for SQLite column
  changes, and give a `server_default` to new non-null columns.
- Production migrates during the Vercel build (`scripts/vercel_build.py`). Prefer
  expand-then-contract changes, so the previous deployment keeps working during a rollout.
- On Postgres a migration waits at most 5 seconds for a lock and 2 minutes for a statement
  ([alembic/env.py](../alembic/env.py)). Past that it rolls back and the build fails, so the
  live deployment keeps serving instead of queueing every request behind the migration. Run a
  slow backfill as its own step, not in a migration.
- Instant Rollback in Vercel rolls back the code, not the schema: a rolled-back deployment
  runs against the newer schema, which is another reason to only add things in a migration.

## Deploying to Vercel

Production is https://jokebox.samarthsaraswat.com. **Merging to `main` deploys.** It runs in
Singapore (`sin1`, set in `vercel.json`), next to the Neon database, which is connected to
Production only, so other branches don't deploy at all (`git.deploymentEnabled` in `vercel.json`):
a preview would have no database to start with, and each deployment keeps a ~38 MB copy of the
server against the free plan's 10 GB Functions Storage. Try a change locally; CI checks the PR.

**Old deployments add up too.** Vercel keeps every deployment, and on the free plan you can only
roll back to the previous one. If Usage → Functions Storage climbs toward 10 GB, delete old
deployments in Project → Deployments, keeping the newest three production ones.

First-time setup:

1. **Database:** in Vercel, go to Storage → create a Neon Postgres database in the same region as
   the server (Singapore), and connect it to the project for Production, with the prefix
   `DATABASE` and no database branches. That sets `DATABASE_URL`.
2. **Google sign-in:** in Google Cloud Console, go to APIs & Services → Credentials → Create OAuth
   client (Web application). Add the redirect URI
   `https://jokebox.samarthsaraswat.com/auth/google/callback`, plus
   `http://localhost:5173/auth/google/callback` for local testing.
3. **Environment variables** (Project → Settings → Environment Variables). The app refuses to
   start on Vercel without them:

   | Name | Value |
   |---|---|
   | `APP_ENV` | `production` |
   | `SESSION_SECRET` | `python3 -c "import secrets; print(secrets.token_urlsafe(48))"` |
   | `ALLOWED_EMAILS` | Google accounts allowed in, comma-separated |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | From step 2 |
   | `PUBLIC_URL` | `https://jokebox.samarthsaraswat.com` |
   | `APP_VERSION` | Optional; shown by `/health` |

4. **Voice storage:** go to Storage → Create → **Blob**, set access to **Private**, and connect it.
   That adds `BLOB_STORE_ID`. The app authenticates with Vercel's OIDC token, so there's no key
   to copy. The free plan holds 1 GB.
5. **Import the repo** with the root directory left as is; Vercel detects FastAPI from
   `app/main.py`.
6. **Domain:** go to Project → Domains → add the domain, then add the CNAME record at your DNS
   provider.

Google only accepts the redirect URIs you registered, so sign in on production (or on a
registered fixed domain).

## Operations runbook

| Task | How |
|---|---|
| Is it up? | `curl https://jokebox.samarthsaraswat.com/health` should return `{"status":"ok",…}` |
| Invite someone | Add their Google email to `ALLOWED_EMAILS`, then redeploy. Taking an email off signs that person out (and their Claude connector) on their next request |
| Roll back | Vercel → Deployments → choose the previous production deployment → **Promote**. Migrations don't roll back automatically, so keep them backwards-compatible |
| Rotate the session secret | Change `SESSION_SECRET` and redeploy. Everyone is signed out |
| Logs | Vercel → Project → Logs (runtime) or the deployment's build log |
| Voice storage filling up | The Voice notes page shows how much of the 1 GB is used. Upgrade the Blob plan or delete old notes |
| Load demo data into an account | `DATABASE_URL=<url> uv run python -m app.seed someone@example.com` (this replaces their data; a database on another machine also needs `--replace-remote-account`) |

## Bringing over old Bit Vault data

```bash
uv run --with firebase-admin scripts/export_firestore.py --key ~/Downloads/service-account.json \
  --email you@gmail.com --out ~/bitvault-export.json
DATABASE_URL="<neon url>" uv run python -m app.seed you@gmail.com --file ~/bitvault-export.json --dry-run
```

Drop `--dry-run` and add `--replace-remote-account` to load it: against a database that isn't on
this machine the command refuses without it. Loading replaces everything in that account. Keep the service-account
key and the export **out of the repo**.

## Regenerating icons and screenshots

- **Icons:** `uv run python scripts/make_icons.py` writes the PWA icons and splash screens into
  `web/public/`.
- **README screenshots** (`docs/screenshots/`), all made-up material:
  1. Point `DATABASE_URL` at a scratch SQLite file, then `uv run alembic upgrade head` and
     `uv run python -m app.seed dev@example.com` for the demo data.
  2. Make three short audio files, `note0.m4a` to `note2.m4a`, in a folder (any sound will do,
     e.g. `ffmpeg -f lavfi -i "anoisesrc=d=20:c=pink:a=0.5" -c:a aac note0.m4a`).
  3. `PYTHONPATH=. uv run python scripts/screenshot_demo.py <that folder>` adds shows over six
     months, rated and tagged sets, observations, voice notes, craft notes, a brainstorm, a
     rewrite, the watchlist, an analysis, a few things in the Trash, and (from
     `screenshot_extras.py`) two premises and how the demo set's jokes went at the last four shows.
  4. Run the app on that database, sign in with the local test account and capture at 2x:
     1440×900 (desktop) and 390×844 (phone). Save them as WebP (`cwebp -q 82`) to keep the repo
     small.
