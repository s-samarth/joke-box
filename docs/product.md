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
2. **Work an idea into a joke:** setup, punchline, alternate punches, tag lines, rewrites against a clock.
3. **Build and run a set:** a point and beats in order, each with its premises, jokes and crowd work; gates for jokes that depend on the one before; timed against the slot; walked through on stage.
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
5. **Stage-ready.** Bird's eye view walks the set one beat at a time in big type, asking each gate as you
   reach it, with the clock and the open-mic light pinned on top, and it keeps the screen awake.
   The cue card gives you the spine to memorise, on screen or paper.
6. **Your material stays yours.** It's private by default and allowlisted, and real jokes never go
   into seeds, fixtures or tests. Deleting anything sends it to the Trash for 30 days first, a
   nightly encrypted backup keeps a copy of everything, and Download everything gives you all of
   it as one file ([backups.md](backups.md)).

## Feature map

| Area | What it does | Screen |
|---|---|---|
| **Home** | The daily joke nudge, one box with three tabs to write an observation, premise or joke, shortcuts to all three, the Activity calendar, record a voice note, start a brainstorm, a search button, study shortcuts, topic folders, next set, last show | `/` |
| **Search** | One search across everything: jokes, premises, observations, brainstorms (typed words; not handwriting), rewrites, voice notes, sets, shows, Craft, analyses and the watchlist. Works offline, on what the phone already holds | `/search` |
| **Activity** | How the writing and the stage are going, with nothing to fill in: the joke and stage streaks, one calendar of everything written each day plus a gold dot per show (the month's stage time big, its shows as tally marks), and the day you tap as four counts; the calendar also sits on Home. Then the **writing pulse** (the step where ideas stall, everything by status, how far ideas got, month on month, when you write, what's idle), **highlights** (best months, big days, the year as a grid of days) and the **year review**, the year so far or a past one wrapped, as full-screen cards | `/activity` |
| **Jokes** | Searchable list with topic, type, status and sort filters; each joke edited in place; CSV export. A List / Map / Web switch shows the same jokes as the Map of joke chains or the Web of premises with their jokes, full screen (and beside the list on a wide screen) | `/jokes`, `/jokes/:id`, `/jokes/map` |
| **Premises** | The ideas under your jokes ("X is Y, because Z"): each one's take and notes, and every joke resting on it in chain order | `/premises`, `/premises/:id` |
| **New joke** | The + button: a full sheet with every field, prefilled from where you are. Closing it keeps what you typed for next time. On Premises, Shows and Observations the + makes one of those instead | sheet |
| **Rewrite** | Full-screen timed rewrite of one joke; every save keeps a version | `/jokes/:id/rewrite` |
| **Observations** | Things you noticed that aren't jokes yet, by joke topic and kind (set ideas, questions), linked both ways to the jokes and premises that came from them | `/observations` |
| **Brainstorm** | Free writing sessions with a timer: type or handwrite (Apple Pencil), link jokes and observations, search the typed words, and turn a session into a joke | `/brainstorm`, `/brainstorm/:id` |
| **Voice notes** | Record, see the level meter, name and tag it straight away, play back, search by label or hashtag, turn one into a joke | `/voice` |
| **Sets** | A point and a spine of beats in a fixed order. Each beat has a cue, its own time, labels (status, persona side...) and an ordered list of premises, jokes and crowd work; jokes are locked or loose, and a gate guards the jokes after it. A status track and checks from your Craft notes ([sets.md](sets.md)) | `/sets`, `/sets/:id` |
| **Bird's eye view** | The set one beat at a time, punchlines as cue lines, each gate asked as you reach it, with the clock and the open-mic light pinned on top | `/sets/:id/stage` |
| **Cue card** | What you memorise: the point, then each beat's cue and time with its premises under it. Prints | `/sets/:id/print` |
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
| **Alternate punch** | Another ending for the same setup, kept under the punchline in use. A joke can have as many as you like. **Use** swaps one in as the punchline and keeps the one it replaced as an alternate, so nothing is lost. Never shown on stage or in print. |
| **Tag line** | An extra punchline that follows the main punch. |
| **Random** | The default topic for anything unfiled. The protected `Random` topic, which can't be renamed or deleted, and picks up the jokes of any deleted topic. |
| **Topic / subtopic** | Folders for jokes. Premises and observations are filed under the same topics (one shared list; Random by default); subtopics are for jokes only. Observations also have kinds of their own. |
| **Type** | The form of a joke: One-Liner, Story, Crowd Work, Roast, Observation, Premise, Act Out, or your own. A type exists only while some joke uses it; a joke with no type shows as "Undefined". |
| **Strength** | 1–5: Weak, Needs work, Decent, Strong, Killer, drawn as five ticks; or **Unrated**, which is how every new joke starts, so a 3 always means you chose it. Sorting by strength puts unrated jokes last. |
| **Status** | Incomplete, Work in Progress, Complete, Draft, Stage Ready, Need Tags, or your own. Every joke has one; new jokes start as Draft. |
| **Runs for** | How long the joke takes on stage (minutes and seconds boxes). |
| **Clean rating** | Clean, Mild or Dirty. |
| **Set** | One show's material: a **point**, then **beats** in a fixed order, each with a **cue**, its own time and an ordered list of premises, jokes and crowd work. See [sets.md](sets.md). |
| **Beat** | A section of a set you remember by one cue word. Beats never branch; anything that depends on the room (a **gate**: the next jokes only if this one lands) lives inside a beat. |
| **Slot** | The time you've been given. The **light** is the open-mic signal: amber with a minute to go, red once you're over. |
| **Show** | One performance, logged afterwards: venue, date, time on stage, crowd size, 1–5 stars, topics, remarks, and optionally particular jokes with how each went (bombed, ok, killed) and a comment. |
| **Rewrite** | A timed session reworking one joke. Each save is a version. |
| **Brainstorm session** | A free writing session not tied to one joke. |
| **Observation** | Something you noticed, before it's a joke. |
| **Craft note** | Something you've learned about doing stand-up, not material. Its **kind** is yours to name (you start with Checklist, Technique, Reference and Path) and works like one of four things: a note to read, a checklist, a writing technique or a path. Its **area** is the folder it lives in. You start with seven areas and can add, rename, recolour, reorder and delete them; each area picks the screens (Rewrite, set builder, Stage) that show its notes. |
| **LPM** | Laughs per minute: each laugh scored by how much of the room reacted, 1 (one or two people) to 5 (an applause break), the points divided by the minutes on stage. The full scale is in [set-review.md](set-review.md#the-laugh-scale). |
| **Cluster** | Versions of one joke kept together: the same punch, said another way. Each version is a whole joke with its own status and show record, and one is the **lead**, the version you'd do tonight. A set plays the lead unless it pins a version. |
| **Path** | Your goals as tick boxes in a Path note (levels, a task list). Tick boxes under different headings are separate tracks, each drawn as its own staircase. Home shows the next step. |
| **Routine** | An item on the watchlist: a known set by another comic. |
| **CT / LD / HP** | A routine's three optional 0–10 scores: Contrast, Logic Density, Has a Point. |

## Where the product is going

These aren't built yet; the schema leaves room for them:

- **Strength from stage results:** shows now record how each joke went; strength could follow
  that record instead of being set by hand.
- **Trend charts:** rating, crowd and stage time across weeks.
