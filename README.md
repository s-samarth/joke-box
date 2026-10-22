# JokeBox

**A private notebook for a stand-up comedian.** Catch an idea in two seconds, by typing, speaking
or handwriting. Work it into a joke, tape it into a set, run the set on stage with the clock, and log how it went
on the way home. It works in the browser and installs on your phone as an app, including with no
signal.

Live at **[jokebox.samarthsaraswat.com](https://jokebox.samarthsaraswat.com)** (invite-only Google sign-in).

<img src="docs/screenshots/desktop-home.webp" alt="JokeBox home screen: 'Got something?' with quick capture, voice notes and observations">

<p align="center">
  <img src="docs/screenshots/phone-home.webp" width="19%" alt="Home on a phone">
  <img src="docs/screenshots/phone-new-joke.webp" width="19%" alt="Adding a joke on a phone">
  <img src="docs/screenshots/phone-set-builder.webp" width="19%" alt="Building a set on a phone">
  <img src="docs/screenshots/phone-stage.webp" width="19%" alt="Stage mode on a phone">
  <img src="docs/screenshots/phone-more.webp" width="19%" alt="The More sheet on a phone">
</p>

## What's inside

| | |
|---|---|
| **Jokes.** Search and filter everything, then edit a joke in place: premise, punch, tag lines, strength, type, topic, runtime, clean rating, language. Changes save on their own, and an edit made on another device is caught, not overwritten. <br><br> <img src="docs/screenshots/desktop-joke.webp" alt="A joke open beside the list"> | **Daily joke.** One new joke a day, a calendar of ticks and your streak. The nudge on Home goes from yellow to red to spooky the longer you skip. <br><br> <img src="docs/screenshots/desktop-daily.webp" alt="Daily joke with a streak calendar"> |
| **Observations.** Things you noticed that aren't jokes yet, under their own topics. Turn one into a joke when the angle shows up. <br><br> <img src="docs/screenshots/desktop-observations.webp" alt="Observations grouped by month"> | **Voice notes.** Tap to record, with a live level meter. Name and tag the note the moment you stop and play it before it's uploaded. Offline recordings wait on the phone, and a recording cut off by a locked screen comes back. <br><br> <img src="docs/screenshots/desktop-voice.webp" alt="Voice notes with hashtags"> |
| **Brainstorm.** Timed writing sessions. Type, or handwrite with Apple Pencil (palm rejection included), start from a technique in Craft, and link the jokes and observations a session touches. <br><br> <img src="docs/screenshots/desktop-session.webp" alt="A brainstorm session with typing and handwriting"> | **Rewrite.** Rework one joke against a timer. Every version is kept, so you can go back. <br><br> <img src="docs/screenshots/desktop-rewrite.webp" alt="Rewriting a joke against a timer"> |
| **Sets.** Every set with its stars, tags and length against the slot. Filter by tag (In progress, Opener set, One-liners, or your own). <br><br> <img src="docs/screenshots/desktop-sets.webp" alt="Sets with ratings and tags"> | **Set builder.** Your jokes as strips of masking tape. Drag them into order (touch too), rate the set, tag it, and see each joke's strength. Mark a joke optional and it turns to faded paper and stops counting towards the slot. <br><br> <img src="docs/screenshots/desktop-set-builder.webp" alt="Set builder with tape strips, rating and tags"> |
| **Stage.** Full screen, big marker type, and a clock that goes amber, then red. Tap right for the next joke. The screen stays awake. <br><br> <img src="docs/screenshots/desktop-stage.webp" alt="Stage mode"> | **Print.** A clean sheet of the set to take with you, with runtimes and the optional jokes marked. <br><br> <img src="docs/screenshots/desktop-print.webp" alt="Printable set list"> |
| **Shows.** Log a show in under a minute; ticking the sets you did fills in the topics. Totals and laughs per minute follow every filter, and the table sorts and exports to CSV. <br><br> <img src="docs/screenshots/desktop-shows.webp" alt="Shows with totals and a sortable table"> | **Timeline.** A mic diary of every night you went up, brighter for better nights, and your rating over time. <br><br> <img src="docs/screenshots/desktop-timeline.webp" alt="Timeline of shows"> |
| **Insights.** Recent form against the shows before, each topic month by month, and which topics, rooms, set lengths and slots work. <br><br> <img src="docs/screenshots/desktop-insights.webp" alt="Show insights"> | **Craft.** What you know about doing stand-up, in areas you arrange: checklists, techniques, references, and a path whose next step shows on Home. <br><br> <img src="docs/screenshots/desktop-craft.webp" alt="Craft with the path and techniques"> |
| **Watchlist.** 100 routines to study, scored by the persona dossier and ticked off as you watch. <br><br> <img src="docs/screenshots/desktop-watchlist.webp" alt="Watchlist"> | **Analysis.** Your write-ups of sets you studied, linked to the routine, with takeaways that go to Craft. <br><br> <img src="docs/screenshots/desktop-analysis.webp" alt="An analysis of a routine"> |
| **Trash.** Anything you delete (jokes, observations, voice notes, shows, analyses and more) waits here for 30 days. Put it back with a click, joke places in sets included, or empty it. <br><br> <img src="docs/screenshots/desktop-trash.webp" alt="Trash with jokes and observations"> | **Your own order.** Drag topics, subtopics and observation topics into the order you want; every list in the app follows it. <br><br> <img src="docs/screenshots/desktop-topics.webp" alt="Dragging topics into order"> |

<p align="center">
  <img src="docs/screenshots/phone-jokes.webp" width="19%" alt="Jokes on a phone">
  <img src="docs/screenshots/phone-joke.webp" width="19%" alt="A joke on a phone">
  <img src="docs/screenshots/phone-voice.webp" width="19%" alt="Voice notes on a phone">
  <img src="docs/screenshots/phone-shows.webp" width="19%" alt="Shows on a phone">
  <img src="docs/screenshots/phone-craft.webp" width="19%" alt="Craft on a phone">
</p>

Plus:
- **Works offline.** Saves made with no signal wait on the phone and sync when you're back, and the sync light says when everything is safely saved.
- **Installs as an app** on your phone's home screen.
- **Import** jokes, observations, voice notes and craft notes from a prepared folder, skipping anything already there.
- **Several tabs** if you want them: one tab at a time by default, so offline saves can't clash, with a switch in the account menu.
- Topic folders on Home, a "needs work" list, and CSV export of your shows.

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
