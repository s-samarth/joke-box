# JokeBox: product overview

JokeBox is a private notebook for a stand-up comedian. It holds every stage of the work: a
half-thought on the bus, a voice memo, a premise, a finished bit, the set it goes into, how it
went at the mic, and what you learned from watching other comics.

It runs in the browser and installs on a phone as an app. Capture works offline.

## Who it's for

**Main user:** a working open-mic comedian, writing in English, Hinglish and Hindi, doing
several spots a week (the app shows every date and time in India time). They write all day in
scraps and need those scraps in one place, sorted enough to build a tight five or fifteen
minutes from them.

What they need, in order of how often it comes up:

1. **Catch an idea before it's gone:** typed, spoken, or written by hand, in a couple of seconds,
   with or without a signal.
2. **Work an idea into a joke:** premise, punch, tag lines, rewrites against a clock.
3. **Build and run a set:** pick the bits, order them, fit them to the slot, rehearse, perform.
4. **Learn from each show:** log it on the way home, see the trend over weeks.
5. **Study the craft:** what you've learned about doing stand-up (checklists, writing techniques,
   reference and goals), a watchlist of routines, and written analyses of sets.

**Access:** sign-in is Google, and only accounts on an allowlist get in. Each account sees only its
own data. Today that is one comedian, but the system works for more than one.

## Problems it solves

| Before | In JokeBox |
|---|---|
| Ideas spread across Notes, WhatsApp-to-self, voice memos and paper | One app: jokes, observations, voice notes and brainstorms, all searchable |
| Setlists on paper; timing guessed | Sets are timed against the slot, with the open-mic "light" built in |
| No record of how bits did on stage | Shows are logged in under a minute; totals follow any filter |
| The old Bit Vault (Firebase) broke on phones, served stale builds, and lost data on rename | Built again with ids, transactions, a proper offline queue and an update prompt |

## Product principles

1. **Capture first.** The app opens on Home, and the first thing on Home is a text box. Enter
   saves. Nothing about filing is required to save a thought.
2. **Everything saves itself.** There is no Save button on a joke, a set or a brainstorm. Changes
   save a moment after you stop, and when you leave the page.
3. **Offline is normal.** Green rooms and metros have no signal. Reading works offline, and so does
   saving jokes, observations, brainstorms, watchlist ticks, analyses and voice notes. All of it
   syncs when you're back online.
4. **Phone first, laptop comfortable.** Every screen is designed at 390 px wide, with large tap
   targets and safe-area padding. Desktop adds a side rail and two-pane layouts.
5. **Stage-ready.** Stage mode is big, high-contrast and tap-anywhere, and it keeps the screen
   awake. Printing gives clean paper.
6. **Your material stays yours.** It's private by default and allowlisted, and real jokes never go
   into seeds, fixtures or tests.

## Feature map

| Area | What it does | Screen |
|---|---|---|
| **Home** | Quick capture, record a voice note, log an observation, start a brainstorm, study shortcuts, topic folders, next set, "Needs work", last show | `/` |
| **Jokes** | Searchable list with topic, type, status and sort filters; each joke edited in place; CSV export | `/bits`, `/bits/:id` |
| **New joke** | The + button anywhere: a full sheet with every field, prefilled from where you are | sheet |
| **Rewrite** | Full-screen timed rewrite of one joke; every save keeps a version | `/bits/:id/rewrite` |
| **Observations** | Things you noticed that aren't jokes yet, with their own topics; turn one into a joke | `/observations` |
| **Brainstorm** | Free writing sessions with a timer: type or handwrite (Apple Pencil), link jokes and observations | `/brainstorm`, `/brainstorm/:id` |
| **Voice notes** | Record, see the level meter, name and tag it straight away, play back, search by label or hashtag | `/voice` |
| **Sets** | Bits as masking-tape strips: drag to order, time against the slot, opener and closer marked | `/sets`, `/sets/:id` |
| **Stage** | Full-screen rehearse and perform mode with a clock and the open-mic light | `/sets/:id/stage` |
| **Print** | A set on paper with each bit's running time | `/sets/:id/print` |
| **Shows** | Log a show; totals, filters, a sortable table, CSV export | `/shows` |
| **Craft** | What you know about doing stand-up: checklists, techniques, reference and goals, grouped by where in the work you use them | `/craft`, `/craft/:id` |
| **Watchlist** | 100 routines from the persona dossier plus your own, scored and ticked off | `/watchlist` |
| **Analysis** | Your write-ups of sets and online bits, optionally tied to a routine | `/analysis` |
| **External links** | Your persona site and Comedy Atlas | `/links` |

Each screen is described in [screens.md](screens.md), and the end-to-end journeys are in
[user-flows.md](user-flows.md).

## The words the app uses

The vocabulary is a comic's, not a database's. Keep to it in the code and in the copy.

| Term | Meaning |
|---|---|
| **Joke** (or **bit**) | The unit of material: a setup (premise), a punchline, and its details. The UI says "joke"; the code and API say `bit`. |
| **Premise / punch** | The setup and the punchline. |
| **Tag line** | An extra punchline that follows the main punch. |
| **Thoughts** | The default topic for anything unfiled. Stored as the protected `Random` topic, which can't be renamed or deleted, and picks up the jokes of any deleted topic. |
| **Topic / subtopic** | Folders for jokes. Observations have their own separate topics. |
| **Type** | The form of a joke: One-Liner, Story, Crowd Work, Roast, Observation, Premise, Act Out, or your own. A type exists only while some joke uses it; a joke with no type shows as "Undefined". |
| **Strength** | 1–5: Weak, Needs work, Decent, Strong, Killer. Drawn as five ticks. |
| **Status** | Incomplete, Work in Progress, Complete, Status Unknown, Draft, Stage Ready, or your own. |
| **Runs for** | How long the joke takes on stage (m:ss). |
| **Clean rating** | Clean, Mild or Dirty. |
| **Set** | An ordered list of jokes for one show, with a slot length. The first is the **opener**, the last the **closer**. |
| **Slot** | The time you've been given. The **light** is the open-mic signal: amber with a minute to go, red once you're over. |
| **Show** | One performance, logged afterwards: venue, date, time on stage, crowd size, 1–5 stars, topics and remarks. |
| **Rewrite** | A timed session reworking one joke. Each save is a version. |
| **Brainstorm session** | A free writing session not tied to one joke. |
| **Observation** | Something you noticed, before it's a joke. |
| **Craft note** | Something you've learned about doing stand-up, not material. Its **kind** says how it's used (checklist, technique, reference, path) and its **area** says where (writing, generating, rewriting, building a set, on stage, formats, measuring and path). |
| **LPM** | Laughs per minute: each laugh scored 1 (a few giggles) to 5 (laughs and applause), the points divided by the minutes on stage. |
| **Path** | Your goals as tick boxes in a Path note (levels, a task list). Home shows the next step. |
| **Routine** | An item on the watchlist: a known set by another comic. |
| **SI / LD / DP** | The dossier's three 0–10 scores for a routine: Schemer Index, Logic Density, Dark Pragmatism. |

## Where the product is going

These aren't built yet; the schema leaves room for them:

- **Per-joke stage results:** which bits in a set landed at a given show, so strength can follow real
  data.
- **Trend charts:** rating, crowd and stage time across weeks.
- **Linking voice notes to jokes**, the way brainstorm sessions already link.
