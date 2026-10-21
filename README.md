# JokeBox

**A private notebook for a stand-up comedian.** Catch an idea in two seconds, by typing, speaking
or handwriting. Work it into a joke, tape it into a set, run the set on stage with the clock, and log how it went
on the way home. It works in the browser and installs on your phone as an app, including with no
signal.

Live at **[jokebox.samarthsaraswat.com](https://jokebox.samarthsaraswat.com)** (invite-only Google sign-in).

<img src="docs/screenshots/desktop-home.png" alt="JokeBox home screen: 'Got something?' with quick capture, voice notes and observations">

<p align="center">
  <img src="docs/screenshots/phone-home.png" width="22%" alt="Home on a phone">
  <img src="docs/screenshots/phone-set-builder.png" width="22%" alt="Building a set on a phone">
  <img src="docs/screenshots/phone-stage.png" width="22%" alt="Stage mode on a phone">
  <img src="docs/screenshots/phone-more.png" width="22%" alt="The More sheet on a phone">
</p>

## What's inside

| | |
|---|---|
| **Jokes.** Search and filter everything, then edit a joke in place: premise, punch, tag lines, strength, type, topic, runtime, clean rating, language. Changes save on their own. <br><br> <img src="docs/screenshots/desktop-joke.png" alt="A joke open beside the list"> | **Sets.** Your jokes as strips of masking tape. Drag them into order (touch too) and watch the total against the slot, with the open-mic light at one minute to go. <br><br> <img src="docs/screenshots/desktop-set-builder.png" alt="Set builder with tape strips"> |
| **Stage.** Full screen, big marker type, and a clock that goes amber, then red. Tap right for the next joke. The screen stays awake. <br><br> <img src="docs/screenshots/desktop-stage.png" alt="Stage mode"> | **Shows.** Log a show in under a minute; ticking the sets you did fills in the topics. Totals follow every filter; the table sorts and exports to CSV, Timeline shows a mic diary and your rating trend, and Insights shows recent form, each topic month by month and which topics, rooms, set lengths and slots work. <br><br> <img src="docs/screenshots/desktop-shows.png" alt="Shows with totals and a sortable table"> |
| **Voice notes.** Tap to record, with a live level meter. Name and tag the note the moment you stop, and play it before it's even uploaded. Offline recordings wait on the phone. <br><br> <img src="docs/screenshots/desktop-voice.png" alt="Voice notes"> | **Brainstorm.** Timed writing sessions. Type, or handwrite with Apple Pencil (palm rejection included), and link the jokes and observations a session touches. <br><br> <img src="docs/screenshots/desktop-session.png" alt="A brainstorm session"> |
| **Observations.** Things you noticed that aren't jokes yet, under their own topics. Turn one into a joke when the angle shows up. <br><br> <img src="docs/screenshots/desktop-observations.png" alt="Observations"> | **Watchlist and Analysis.** 100 routines to study, scored by the persona dossier, ticked off as you watch, with your write-ups of sets alongside. <br><br> <img src="docs/screenshots/desktop-watchlist.png" alt="Watchlist"> |

Plus: **Rewrite** (rework one joke against a timer, keeping every version), **print view** for
sets, topic folders, a "needs work" list, CSV export, and a sync light that tells you when
everything is safely saved.

## How it's built

```
React 19 + TypeScript + Tailwind v4 (PWA)  ──same origin, cookie──▶  FastAPI (Python 3.12) on Vercel
TanStack Query cache in IndexedDB                                      ├─ SQLAlchemy 2 + Alembic ─▶ Neon Postgres
offline saves replay on reconnect                                      ├─ Vercel Blob (voice notes, private)
                                                                       └─ Google sign-in, allowlisted
```

- **Offline first:** every save uses a client-generated id and an idempotent `PUT`, so saves made
  offline queue on the device and replay safely.
- **Private by design:** Google sign-in limited to an allowlist, every query scoped to the
  signed-in user, CSRF blocked by a required header plus SameSite cookies.
- **One deploy:** Vercel builds the React app onto its CDN, migrates the database, and runs
  FastAPI as a function. Merging to `main` ships.
- **Checked on every PR:** ruff, mypy (strict), 63 pytest tests, Alembic up and down on Postgres;
  tsc, oxlint, 43 Vitest tests and a production build.

## Run it locally

```bash
uv sync && npm --prefix web install
uv run alembic upgrade head
uv run python -m app.seed dev@example.com   # optional: demo data
```

```bash
uv run uvicorn app.main:app --reload --port 8000
```

```bash
npm --prefix web run dev
```

Open http://localhost:5173 and choose **Sign in as the local test account**. No `.env` is needed:
locally it uses SQLite and a folder for voice notes.

## Documentation

| Doc | What's in it |
|---|---|
| [Product overview](docs/product.md) | Who it's for, the problems it solves, principles, the feature map, the comedy vocabulary |
| [User flows](docs/user-flows.md) | Step by step: capture, rework, build a set, perform, log, review, study, offline |
| [Screens](docs/screens.md) and [more screens](docs/screens-perform.md) | Every screen: layout on phone and desktop, the files behind it, its data and behaviour |
| [Design system](docs/design-system.md) | The "Taped setlist" look: colour, type, tape strips, components, and how the copy is written |
| [System design](docs/architecture.md) | Architecture, request lifecycle, auth, data isolation, deployment, CI, trade-offs |
| [Frontend architecture](docs/frontend.md) | Server state, optimistic updates, the offline queue, autosave, the voice pipeline, PWA |
| [Data model](docs/data-model.md) | Every table, what deletes do, migrations, the Bit Vault importer |
| [API reference](docs/api.md) | Every endpoint, with its body and rules |
| [Development and operations](docs/development.md) | Setup, checks, conventions, migrations, deploying to Vercel, runbook |

## Project layout

```
app/        FastAPI: models, schemas, routers, services, auth, seed
alembic/    migrations (append-only; CI enforces it)
tests/      pytest
web/        React app: api/, components/ui/, layout/, features/<area>/, lib/
scripts/    Vercel build, Firestore export, icon generator
docs/       documentation and screenshots
```

Screenshots show the made-up demo account. Real material never goes in the repo.
