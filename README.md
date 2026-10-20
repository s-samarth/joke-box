# JokeBox

A private vault for a comedian's bits, setlists and open mics. Works as a website and as an
installable app on your phone, including offline capture.

- **Today:** type a premise and press Enter to save it; see your next set, the bits that need
  work and your last show.
- **Bits:** a searchable list with topic, type, status and sort filters. Each bit has its own page
  where you edit everything in place (setup, punchline, tag lines, strength, type, topic, status,
  runtime, clean rating, language, hashtags, notes), start a timed **Rewrite** that keeps
  versions, and add it to a set.
- **Sets:** bits as masking-tape strips you drag into order (works on touch), timed against the
  slot with an open-mic "light" at one minute left; a full-screen rehearse/stage mode and a print
  view.
- **Shows:** log each show in under a minute (pick the set you did to fill in time and topics),
  then filter, sort and export.
- **Voice notes:** tap record on Today or the Voice page; stopping saves. Label and hashtag notes
  now or later, search them, play them back. Recordings made offline wait on the phone and upload
  when you're back online. Audio lives in a private Vercel Blob store (a local folder in dev).

Stack: FastAPI + SQLAlchemy + Alembic (Python 3.12, `app/`), React + TypeScript + Tailwind +
TanStack Query (`web/`). SQLite locally, Postgres (Neon) on Vercel. Sign-in is Google, limited to
an allowlist.

## Run it locally

```bash
uv sync && npm --prefix web install
uv run alembic upgrade head
uv run python -m app.seed dev@example.com   # optional: demo data
```

Then, in two terminals:

```bash
uv run uvicorn app.main:app --reload --port 8000
npm --prefix web run dev
```

Open http://localhost:5173 and use **Local dev sign-in** (it only exists when `APP_ENV=local`).
No `.env` is needed; copy `.env.example` to `.env` to try Google sign-in locally.

Checks: `uv run ruff check . && uv run mypy app && uv run pytest` and
`npm --prefix web run typecheck && npm --prefix web run lint && npm --prefix web test`.

## Deploy to Vercel

1. **Database:** in Vercel, Storage → create a Neon Postgres database and connect it to the
   project. That sets `DATABASE_URL` (and gives each preview deployment its own branch database).
2. **Google sign-in:** Google Cloud Console → APIs & Services → Credentials → Create OAuth client
   (Web application). Authorised redirect URI:
   `https://jokebox.samarthsaraswat.com/auth/google/callback`
   (add `http://localhost:5173/auth/google/callback` for local testing).
3. **Environment variables** (Project → Settings → Environment Variables). Set these for
   Production; for previews, set the same with `APP_ENV=preview`. The app refuses to start on
   Vercel without them:

   | Name | Value |
   |---|---|
   | `APP_ENV` | `production` |
   | `SESSION_SECRET` | `python3 -c "import secrets; print(secrets.token_urlsafe(48))"` |
   | `ALLOWED_EMAILS` | your Google address (comma-separate to invite others) |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | from step 2 |
   | `PUBLIC_URL` | `https://jokebox.samarthsaraswat.com` |

4. **Voice notes storage:** Storage → Create → **Blob**, set access to **Private**, and connect it
   to the project. That adds `BLOB_STORE_ID`; the app signs in to the store with Vercel's OIDC
   token, so there's no key to copy. Without it, voice notes answer 503 on Vercel. The free plan
   holds 1 GB; the Voice page shows how much is used.
5. **Import the repo** in Vercel with the root directory as is; it detects FastAPI from
   `app/main.py`. The build step (`scripts/vercel_build.py`) builds the React app and runs
   `alembic upgrade head`.
6. **Domain:** Project → Domains → add `jokebox.samarthsaraswat.com`, then add the CNAME record
   Vercel shows at your DNS provider.

Preview deployments work, but Google sign-in only accepts the redirect URIs you registered, so
sign in on production (or register a fixed preview domain).

## Bring over your old Bit Vault data

```bash
uv run --with firebase-admin scripts/export_firestore.py --key ~/Downloads/service-account.json \
  --email you@gmail.com --out ~/bitvault-export.json
DATABASE_URL="<neon url>" uv run python -m app.seed you@gmail.com --file ~/bitvault-export.json --dry-run
```

Drop `--dry-run` to load it. Loading replaces everything in that account. "Tags:" typed into
punchlines become tag lines; brainstorms of deleted bits are skipped and listed. Keep the key
and the export out of the repo.

## Install on your phone

Open the site, then Share → **Add to Home Screen** (iPhone) or menu → **Install app** (Android).
Bits you've loaded stay readable offline; new and edited bits made offline sync when you're back
online (the dot in the header turns amber, then green).
