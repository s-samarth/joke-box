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
| pytest (77 tests) | `tests/` | Auth and allowlist, CSRF header, user isolation on every resource, topic and type transactions, setlist ownership, voice upload limits, the importer, the watchlist dossier, craft notes and areas |
| Vitest (60 tests) | `web/src/**/*.test.ts` | Durations and IST dates, set timing, show filters and weighted rating, ink geometry, voice format choice, the loudness curve, watchlist helpers, import bundles, the craft note format, LPM and the path |

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
- **Write the copy** by the rules in [design-system.md](design-system.md#words-in-the-app).
- **No real jokes** in seeds, fixtures, tests or screenshots. Use obviously made-up material, like
  the demo set.
- **Ask before adding a dependency,** and commit the lockfile with it.

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

## Deploying to Vercel

Production is https://jokebox.samarthsaraswat.com. **Merging to `main` deploys.** Every PR gets
a preview deployment with its own Neon branch database.

First-time setup:

1. **Database:** in Vercel, go to Storage → create a Neon Postgres database and connect it to the
   project. That sets `DATABASE_URL`.
2. **Google sign-in:** in Google Cloud Console, go to APIs & Services → Credentials → Create OAuth
   client (Web application). Add the redirect URI
   `https://jokebox.samarthsaraswat.com/auth/google/callback`, plus
   `http://localhost:5173/auth/google/callback` for local testing.
3. **Environment variables** (Project → Settings → Environment Variables). The app refuses to
   start on Vercel without them:

   | Name | Value |
   |---|---|
   | `APP_ENV` | `production` (`preview` for preview deployments) |
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
registered fixed preview domain).

### Preview database cleanup

Every preview deployment gets its own Neon branch (`preview/<git branch>`), a copy of the
production database. Neon's free plan allows 10 branches per project, so after nine previews new
ones fail with "Resource provisioning failed". The
[Neon preview cleanup](../.github/workflows/neon-preview-cleanup.yml) workflow deletes a PR's
branch when the PR closes, and sweeps stale ones every Monday. It needs two settings, made once:

1. In the Neon console, go to Account settings → API keys → create a key. Then run
   `gh secret set NEON_API_KEY` and paste the key when prompted.
2. In the Neon console, go to the project → Settings → copy the **Project ID**. Then run
   `gh variable set NEON_PROJECT_ID --body <project-id>`.

To clear stale branches by hand, open Actions → **Neon preview cleanup** → Run workflow. A run
with **dry_run** ticked only lists what it would delete; untick it to delete. The workflow only ever
touches `preview/*` branches.

## Operations runbook

| Task | How |
|---|---|
| Is it up? | `curl https://jokebox.samarthsaraswat.com/health` should return `{"status":"ok",…}` |
| Invite someone | Add their Google email to `ALLOWED_EMAILS`, then redeploy |
| Roll back | Vercel → Deployments → choose the previous production deployment → **Promote**. Migrations don't roll back automatically, so keep them backwards-compatible |
| Rotate the session secret | Change `SESSION_SECRET` and redeploy. Everyone is signed out |
| Logs | Vercel → Project → Logs (runtime) or the deployment's build log |
| Voice storage filling up | The Voice notes page shows how much of the 1 GB is used. Upgrade the Blob plan or delete old notes |
| Load demo data into an account | `DATABASE_URL=<url> uv run python -m app.seed someone@example.com` (this replaces their data) |

## Bringing over old Bit Vault data

```bash
uv run --with firebase-admin scripts/export_firestore.py --key ~/Downloads/service-account.json \
  --email you@gmail.com --out ~/bitvault-export.json
DATABASE_URL="<neon url>" uv run python -m app.seed you@gmail.com --file ~/bitvault-export.json --dry-run
```

Drop `--dry-run` to load it. Loading replaces everything in that account. Keep the service-account
key and the export **out of the repo**.

## Regenerating icons and screenshots

- **Icons:** `uv run python scripts/make_icons.py` writes the PWA icons and splash screens into
  `web/public/`.
- **README screenshots** (`docs/screenshots/`): run the app against a scratch database with the demo
  data, sign in with the local test account, and capture at 1440×900 (desktop) and 390×844 (phone).
