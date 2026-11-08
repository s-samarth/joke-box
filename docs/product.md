# JokeBox: product overview

JokeBox is a private notebook for a stand-up comedian. It holds every stage of the work: a
half-thought on the bus, a voice memo, a premise, a finished joke, the set it goes into, how it
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
2. **Work an idea into a joke:** setup, punchline, tag lines, rewrites against a clock.
3. **Build and run a set:** pick the jokes, order them, fit them to the slot, rehearse, perform.
4. **Learn from each show:** log it on the way home, see the trend over weeks.
5. **Study the craft:** what you've learned about doing stand-up (checklists, writing techniques,
   reference and goals), a watchlist of routines, and written analyses of sets.

**Access:** sign-in is Google, and only accounts on an allowlist get in. Each account sees only its
own data. Today that is one comedian, but the system works for more than one.

## Problems it solves

| Before | In JokeBox |
|---|---|
| Ideas spread across Notes, WhatsApp-to-self, voice memos and paper | One app: jokes, premises, observations, voice notes and brainstorms, and one search across all of it |
| Setlists on paper; timing guessed | Sets are timed against the slot, with the open-mic "light" built in |
| No record of how jokes did on stage | Shows are logged in under a minute, and any joke worth remembering marked bombed / ok / killed with a comment; totals follow any filter; Timeline and Insights show trends and what's working |
| The old Bit Vault (Firebase) broke on phones, served stale builds, and lost data on rename | Built again with ids, transactions, a proper offline queue and an update prompt |

## Product principles

1. **Capture first.** The app opens on Home, and the first thing on Home is a text box. Enter
   saves. Nothing about filing is required to save a thought.
2. **Everything saves itself.** There is no Save button on a joke, a set or a brainstorm. Changes
   save a moment after you stop, and when you leave the page.
3. **Offline is normal.** Basements, green rooms and metros have no signal, or one bar, or wifi
   that wants a sign-in. Reading works offline, and so does saving jokes, observations, shows,
   sets, brainstorms, craft notes, watchlist ticks, analyses and voice notes. It all syncs in
   order when you're back, keeps the time you wrote it, and nothing is dropped: a save the server
   refuses waits in Couldn't sync with what you wrote.
4. **Phone first, laptop comfortable.** Every screen is designed at 390 px wide, with large tap
   targets and safe-area padding. Desktop adds a side rail (icons only on an iPad in landscape) and list-and-detail layouts that give the list the whole screen until something is open.
5. **Stage-ready.** Rehearse shows the whole set as one scrolling script in big type, with the
   clock and the open-mic light pinned on top, and it keeps the screen awake. Printing gives
   clean paper.
6. **Your material stays yours.** It's private by default and allowlisted, and real jokes never go
   into seeds, fixtures or tests. Deleting anything sends it to the Trash for 30 days first, a
   nightly encrypted backup keeps a copy of everything, and Download everything gives you all of
   it as one file ([backups.md](backups.md)).

## Feature map

| Area | What it does | Screen |
|---|---|---|
| **Home** | The daily joke nudge, one box with three tabs to write an observation, premise or joke, shortcuts to all three, the Daily activity calendar, record a voice note, start a brainstorm, a search button, study shortcuts, topic folders, next set, last show | `/` |
| **Search** | One search across everything: jokes, premises, observations, brainstorms (typed words; not handwriting), rewrites, voice notes, sets, shows, Craft, analyses and the watchlist. Works offline, on what the phone already holds | `/search` |
| **Daily activity** | One new joke a day (today's box, the joke streak; the nudge on Home goes from green to yellow, red and spooky), and a calendar of everything written each day: jokes, premises and observations in their own colours, with the month's total. The calendar also sits on Home | `/daily` |
| **Jokes** | Searchable list with topic, type, status and sort filters; each joke edited in place; CSV export. A List / Map / Web switch shows the same jokes as the Map of joke chains or the Web of premises with their jokes, full screen (and beside the list on a wide screen) | `/jokes`, `/jokes/:id`, `/jokes/map` |
| **Premises** | The ideas under your jokes ("X is Y, because Z"): each one's take and notes, and every joke resting on it in chain order | `/premises`, `/premises/:id` |
| **New joke** | The + button: a full sheet with every field, prefilled from where you are. Closing it keeps what you typed for next time. On Premises, Shows and Observations the + makes one of those instead | sheet |
| **Rewrite** | Full-screen timed rewrite of one joke; every save keeps a version | `/jokes/:id/rewrite` |
| **Observations** | Things you noticed that aren't jokes yet, by joke topic and kind (set ideas, questions), linked both ways to the jokes and premises that came from them | `/observations` |
| **Brainstorm** | Free writing sessions with a timer: type or handwrite (Apple Pencil), link jokes and observations, search the typed words, and turn a session into a joke | `/brainstorm`, `/brainstorm/:id` |
| **Voice notes** | Record, see the level meter, name and tag it straight away, play back, search by label or hashtag, turn one into a joke | `/voice` |
| **Sets** | Jokes as masking-tape strips: drag to order, time against the slot, opener and closer marked | `/sets`, `/sets/:id` |
| **Rehearse** | The whole set as one scrolling script, every joke in full, with the clock and the open-mic light pinned on top. Leaving after the clock has run offers to log the show | `/sets/:id/stage` |
| **Print** | A set on paper with each joke's running time | `/sets/:id/print` |
| **Shows** | Log a show, optionally marking particular jokes bombed, ok or killed with a comment; totals, filters, a sortable table, CSV export; Timeline and Insights views | `/shows` |
| **Craft** | What you know about doing stand-up: your path as a staircase, techniques to write with, and your own areas as folders of note cards | `/craft`, `/craft/area/:id`, `/craft/:id` |
| **Watchlist** | Routines you add to study, scored and ticked off. Long notes open with More. A category gets a **Read the guide** link when an analysis has the same name as the category | `/watchlist` |
| **Analysis** | Your write-ups of sets and online jokes, optionally tied to a routine. A saved one opens formatted like a craft note; Edit turns it back into the form | `/analysis` |
| **Trash** | Everything you delete (jokes, premises, sets, observations, voice notes, shows, analyses and more) for 30 days, to put back or erase | `/trash` |

Each screen is described in [screens.md](screens.md), and the end-to-end journeys are in
[user-flows.md](user-flows.md).

## The words the app uses

The vocabulary is a comic's, not a database's. Keep to it in the code and in the copy.

| Term | Meaning |
|---|---|
| **Joke** (or **joke**) | The unit of material: a setup, a punchline, and its details. The UI says "joke"; the code and API say `joke`. |
| **Setup / punchline** | The two parts of a joke: the plain words that make the audience assume something, and the line that breaks it. The UI calls the punchline "the punch" in passing. |
| **Premise** | The idea or opinion under a joke ("X is Y, because Z"), kept on the Premises screen with its notes. A joke can rest on one premise, and one premise can feed many jokes, from any topic. **Premise** is also one of the default types. |
| **Tag line** | An extra punchline that follows the main punch. |
| **Random** | The default topic for anything unfiled. The protected `Random` topic, which can't be renamed or deleted, and picks up the jokes of any deleted topic. |
| **Topic / subtopic** | Folders for jokes. Premises and observations are filed under the same topics (one shared list; Random by default); subtopics are for jokes only. Observations also have kinds of their own. |
| **Type** | The form of a joke: One-Liner, Story, Crowd Work, Roast, Observation, Premise, Act Out, or your own. A type exists only while some joke uses it; a joke with no type shows as "Undefined". |
| **Strength** | 1–5: Weak, Needs work, Decent, Strong, Killer, drawn as five ticks; or **Unrated**, which is how every new joke starts, so a 3 always means you chose it. Sorting by strength puts unrated jokes last. |
| **Status** | Incomplete, Work in Progress, Complete, Draft, Stage Ready, Need Tags, or your own. Every joke has one; new jokes start as Draft. |
| **Runs for** | How long the joke takes on stage (m:ss). |
| **Clean rating** | Clean, Mild or Dirty. |
| **Set** | An ordered list of jokes for one show, with a slot length. The first is the **opener**, the last the **closer**. |
| **Slot** | The time you've been given. The **light** is the open-mic signal: amber with a minute to go, red once you're over. |
| **Show** | One performance, logged afterwards: venue, date, time on stage, crowd size, 1–5 stars, topics, remarks, and optionally particular jokes with how each went (bombed, ok, killed) and a comment. |
| **Rewrite** | A timed session reworking one joke. Each save is a version. |
| **Brainstorm session** | A free writing session not tied to one joke. |
| **Observation** | Something you noticed, before it's a joke. |
| **Craft note** | Something you've learned about doing stand-up, not material. Its **kind** is yours to name (you start with Checklist, Technique, Reference and Path) and works like one of four things: a note to read, a checklist, a writing technique or a path. Its **area** is the folder it lives in. You start with seven areas and can add, rename, recolour, reorder and delete them; each area picks the screens (Rewrite, set builder, Stage) that show its notes. |
| **LPM** | Laughs per minute: each laugh scored 1 (a few giggles) to 5 (laughs and applause), the points divided by the minutes on stage. |
| **Path** | Your goals as tick boxes in a Path note (levels, a task list). Home shows the next step. |
| **Routine** | An item on the watchlist: a known set by another comic. |
| **CT / LD / HP** | A routine's three optional 0–10 scores: Contrast, Logic Density, Has a Point. |

## Where the product is going

These aren't built yet; the schema leaves room for them:

- **Strength from stage results:** shows now record how each joke went; strength could follow
  that record instead of being set by hand.
- **Trend charts:** rating, crowd and stage time across weeks.
- **Linking voice notes to jokes**, the way brainstorm sessions already link.
