# Screens: perform and study

Sets, stage, print, shows and the study screens. The frame, capture and writing screens are in
[screens.md](screens.md).

## Sets: `/sets` and `/sets/:setId`

[SetsPage.tsx](../web/src/features/sets/SetsPage.tsx), [SetBuilder.tsx](../web/src/features/sets/SetBuilder.tsx),
[TapeRow.tsx](../web/src/features/sets/TapeRow.tsx), [SetMeta.tsx](../web/src/features/sets/SetMeta.tsx), [SetTagsSheet.tsx](../web/src/features/sets/SetTagsSheet.tsx), [AddJokes.tsx](../web/src/features/sets/AddJokes.tsx),
[LightBar.tsx](../web/src/features/sets/LightBar.tsx), [setlistMath.ts](../web/src/features/sets/setlistMath.ts),
[useAutosaveSet.ts](../web/src/features/sets/useAutosaveSet.ts), [JokePeek.tsx](../web/src/features/jokes/JokePeek.tsx).

- **List:** sets with the soonest show first. Each card shows the date, venue, joke count, its
  stars and tags, and the light bar, with Rehearse and a ⋯ menu (Open set, Print, Delete set).
  Chips above the list (All, then each tag in use) show only the sets with that tag. **New set**
  creates one and opens it.
- **Builder:** the set name, then Show date, Slot length and Venue. Then **Rating** (five stars; tap
  the same star again to clear it) and **Tags** (tap a tag on or off; **Edit tags** opens a sheet to
  add, rename and delete them, with how many sets use each). Below them, the total against the slot
  with "N left", and the light bar. Then one **tape strip** per joke: a drag handle, the premise in
  marker, the joke's strength as periwinkle ticks, an **optional** toggle (the dashed circle), an
  editable runtime, up and down arrows, and remove. The opener and closer are labelled on their
  strips. An optional joke (one to cut if time is short) is on faded paper tape, labelled Optional;
  it doesn't count towards the slot, and the total says "+N optional". Stage, Print and Home show
  optional jokes the same way.
- **Your jokes:** a column on desktop and a sheet behind **Add jokes** on a phone. It has search,
  topic and type filters, and lists the strongest first; jokes already in the set are dimmed. Tap a
  joke to read it in full (`JokePeek`).
- **Drag and drop** uses dnd-kit, with pointer, touch and keyboard sensors, so it works on phones.
- **Saving:** the set autosaves shortly after each change.
- **Notes on building a set** (the cap icon) opens your Craft notes from Building a set in a sheet:
  checklists tick through, everything else reads as written.

<img src="screenshots/desktop-set-builder.webp" alt="Set builder">
<p>
  <img src="screenshots/phone-set-builder.webp" width="230" alt="Set builder on a phone">
  <img src="screenshots/phone-stage.webp" width="230" alt="Stage mode on a phone">
</p>

## Stage: `/sets/:setId/stage`

[StageView.tsx](../web/src/features/sets/StageView.tsx).

A full screen with no frame. It shows the clock against the slot, reset, and play/pause. The
current joke is bright tape with its punch under it; the others are dimmed tape. Tap the right half
of the screen for the next joke and the left half for the previous one. The clock turns amber in
the last minute and red when you're over. The screen wake lock keeps the phone awake. The cap icon
opens **Before you go on**: your On stage notes, like crowd work and hecklers, with checklists to
tick through.

<img src="screenshots/desktop-stage.webp" alt="Stage mode">

## Print: `/sets/:setId/print`

[PrintView.tsx](../web/src/features/sets/PrintView.tsx).

A white page. It shows the set name, then date, venue and slot. Below that, the jokes, numbered,
each with its premise in marker, the punch, its runtime and "by m:ss" (the running total). A
**Print** button opens the browser's print dialog.

<img src="screenshots/desktop-print.webp" alt="Print view">

## Shows: `/shows`

[ShowsPage.tsx](../web/src/features/shows/ShowsPage.tsx), [ShowsToolbar.tsx](../web/src/features/shows/ShowsToolbar.tsx),
[ShowFilters.tsx](../web/src/features/shows/ShowFilters.tsx), [ShowStats.tsx](../web/src/features/shows/ShowStats.tsx),
[ShowsTable.tsx](../web/src/features/shows/ShowsTable.tsx), [ShowDetail.tsx](../web/src/features/shows/ShowDetail.tsx),
[LogShowSheet.tsx](../web/src/features/shows/LogShowSheet.tsx), [logMath.ts](../web/src/features/shows/logMath.ts),
[logStats.ts](../web/src/features/shows/logStats.ts).

- **Toolbar:** Lifetime / This month / This week, a venue picker and **More filters** (date range,
  stars, set length band, crowd band).
- **Totals:** Shows, On stage, Avg rating (weighted by stage time) and Median crowd. They always
  follow the filters. Under them, the LPM across the shows you counted laughs for (all points over
  all minutes), with its band: beast (12+), decent (9–12), poor (6–9), rough (under 6).
- **Views** ([ViewTabs.tsx](../web/src/features/shows/ViewTabs.tsx), kept in the URL as `?view=`):
  **Shows** (the table), **Timeline** and **Insights**. The toolbar and totals scope all three.
- **Timeline** ([insights/TimelineView.tsx](../web/src/features/shows/insights/TimelineView.tsx),
  [timelineMath.ts](../web/src/features/shows/insights/timelineMath.ts)): a mic diary (one square
  per day, one row of weeks per year you performed in, brighter gold for better nights, a dot for
  two shows in a day, future days outlined), shows per month stacked by rating (empty months kept so
  gaps show), and your rating over your last 10 shows, which breaks at gaps of more than 30 days
  instead of bridging them, against a hairline for your usual.
- **Insights** ([insights/InsightsView.tsx](../web/src/features/shows/insights/InsightsView.tsx),
  [insightMath.ts](../web/src/features/shows/insights/insightMath.ts),
  [formMath.ts](../web/src/features/shows/insights/formMath.ts)), all worked out from your shows on
  every load:
  - **Recent form:** average rating, share at 4 stars or more, share at 2 or less, and average set
    length for your last 10 shows, each with a green or red arrow for how it moved against the 10
    before (set length stays grey: neither way is better).
  - **Topics over time:** a row per topic and a square per month, coloured by how it went that
    month, in the order you first did them: when a joke started, how often it ran, whether it got
    better and when you dropped it. Squares grow to fill the card; on a phone it scrolls sideways
    with the names pinned, opening on the latest months.
  - **Topics, venues, set length and time slot** (IST start): one bar each, split into rough
    (2 stars or less, blue), okay (3, grey) and great (4 or more, gold), best first, with the rating
    against your usual (weighted by stage time) and the show count beside it.
  - **7 shows minimum**, a hard rule for every grouping: anything with fewer is listed as "not
    compared yet" and never charted as better or worse.
  - The charts are hand-drawn SVG and HTML (no chart library), with colours checked for colour-blind
    safety on the dark surface ([vizColors.ts](../web/src/features/shows/insights/vizColors.ts));
    every mark shows a readout on hover or keyboard focus.
- **Table:** Date, Venue, On stage, Crowd, Rating, Topics and Remarks. Click a heading to sort and
  click again to flip the order. On a phone the table scrolls sideways with the date pinned.
- **Log a show** (a sheet, also opened by `?log=1`): venue, stars and length up top. Optional: the
  sets you did (none, one or more: their topics are ticked, time on stage is left to you,
  [setPick.ts](../web/src/features/shows/setPick.ts)), date and time, crowd and remarks.
  **Count laughs for LPM** folds out five counters, one per laugh score from 1 (a few giggles) to 5
  (laughs and applause), with the LPM worked out as you count ([lpm.ts](../web/src/features/shows/lpm.ts),
  [LaughTally.tsx](../web/src/features/shows/LaughTally.tsx)). **What did you learn?** saves a craft
  note linked to the show, in the first area that shows on Stage.
- **A show's detail** shows its LPM, what you learned there, and **Add a lesson**.
- ⋯ → **Venues** ([VenuesSheet.tsx](../web/src/features/shows/VenuesSheet.tsx)): every venue with how
  many shows and sets use it. Delete an unused one straight away; for one in use, pick the venue its
  shows and sets move to first, which is also how to merge duplicates.
- ⋯ → **Export as CSV**.

<img src="screenshots/desktop-shows.webp" alt="Shows">
<img src="screenshots/phone-shows.webp" width="230" alt="Shows on a phone">

## Craft: `/craft`, `/craft/area/:areaId` and `/craft/:noteId`

[CraftPage.tsx](../web/src/features/craft/CraftPage.tsx), [AreaPage.tsx](../web/src/features/craft/AreaPage.tsx),
[CraftNotePage.tsx](../web/src/features/craft/CraftNotePage.tsx), [CraftNoteForm.tsx](../web/src/features/craft/CraftNoteForm.tsx),
[NoteCard.tsx](../web/src/features/craft/NoteCard.tsx), [PathLadder.tsx](../web/src/features/craft/PathLadder.tsx),
[TechniqueShelf.tsx](../web/src/features/craft/TechniqueShelf.tsx), [AreaFolders.tsx](../web/src/features/craft/AreaFolders.tsx),
[AreaSheet.tsx](../web/src/features/craft/AreaSheet.tsx), [ArrangeAreas.tsx](../web/src/features/craft/ArrangeAreas.tsx),
[NoteBody.tsx](../web/src/features/craft/NoteBody.tsx), [NoteList.tsx](../web/src/features/craft/NoteList.tsx), [NoteTable.tsx](../web/src/features/craft/NoteTable.tsx), [bodyFormat.ts](../web/src/features/craft/bodyFormat.ts),
[craftMeta.ts](../web/src/features/craft/craftMeta.ts).

What you've learned about doing stand-up, kept apart from your material. The page reads top to
bottom:

- **Your path** as a staircase: one step per tick box in your first open Path note (your levels),
  done steps filled, the next outlined in tape. Below it the next step, and when it names minutes,
  your most solid material on one topic against that target. Home shows a smaller copy.
- **Write with a technique:** a sideways shelf of your techniques; tapping one opens a brainstorm
  running it.
- **Areas** as folders in their own colours, like the topic folders on Home: the count on the tab,
  the first few notes, and how many of each kind. **New area** is the last folder; **Arrange**
  reorders them and opens any one to edit. **Kinds** lists your kinds of note: add one, rename
  it, change what it works like (a note to read, a checklist, a writing technique, a path), or
  delete it and pick where its notes go.

Areas are yours: name, a line about it, a colour (12 presets or any colour from the picker; they
can repeat, and a new area starts on the next unused one), and which screens show its notes (Rewrite, the
set builder, Stage). Deleting one asks where its notes should go. An area opens as a page of
**note cards** in a masonry grid, each with a face for its kind: a checklist shows its first boxes,
a technique a prompt and **Start**, a path its progress, a reference the start of the text. Each
card's ⋯ menu moves it to another area or deletes it. Searching swaps the folders for matching
cards from every area.

A note opens formatted: headings, lists (numbered items get a badge, indented items sit quietly under
their parent), **bold**, callouts, dividers, a line of steps joined by arrows drawn as a flow, tables
(cards on a phone, so nothing scrolls sideways), and tick boxes you can tick straight away (the
tick is saved into the note). Its area chip at the top moves it to another area. **Edit note** switches to the form: name, kind, area, the note,
where you learned it, a link and hashtags, saved with **Save note** (offline too). The kind and
area menus end with **New kind…** and **New area…**; what you make there is picked straight away.
`/craft/new?area=<id>&kind=checklist` starts one with those filled in (`?screen=stage` picks the
area that shows on Stage); `?show=<id>` or
`?analysis=<id>` links it to where you learned it and fills in **Learned from**.

## Watchlist: `/watchlist`

[WatchlistPage.tsx](../web/src/features/study/WatchlistPage.tsx), [WatchRow.tsx](../web/src/features/study/WatchRow.tsx),
[AddRoutineSheet.tsx](../web/src/features/study/AddRoutineSheet.tsx), [watchMeta.ts](../web/src/features/study/watchMeta.ts).

The header shows progress ("N of M watched"), an explainer for SI, LD and DP, a search box, and
All / To watch / Watched. Routines are grouped by category, each group with its own count. Each
row has a watched circle, its number, title, comedian, description and score chips, plus open,
analyse and delete. **Add routine** adds one; with nothing added yet, the empty list offers the same button.

<img src="screenshots/desktop-watchlist.webp" alt="Watchlist">

## Analysis: `/analysis` and `/analysis/:analysisId`

[AnalysisPage.tsx](../web/src/features/study/AnalysisPage.tsx), [AnalysisEditor.tsx](../web/src/features/study/AnalysisEditor.tsx).

The list is searchable, with the most recently edited first; each row shows the title, a preview
and the link's domain. The editor has a name, a link and the write-up, saved with **Save analysis**
(offline too; it syncs later).
`/analysis/new?watch=<id>` starts one prefilled from a watchlist routine. A saved analysis lists its
**Takeaways** (craft notes learned from it) with **Save a takeaway**.

<img src="screenshots/desktop-analysis.webp" alt="Analysis">

## Import: `/import`

[ImportPage.tsx](../web/src/features/import/ImportPage.tsx), [bundle.ts](../web/src/features/import/bundle.ts),
[runImport.ts](../web/src/features/import/runImport.ts).

Not in the navigation: open it from the avatar menu → **Import**, on a laptop (phones can't pick
folders). Choose a prepared import folder holding `import.json` and an `audio/` folder. The page
lists what's new (jokes, with any topics it will create, observations, voice notes and craft notes) and what it
will skip, then **Import** uploads them one by one with a progress bar and lists any failures.

- Every item has a fixed id, so importing the same folder twice adds nothing. Jokes and observations
  whose words are already in JokeBox are skipped too.
- Original dates are kept. A joke with no topic goes to Thoughts; topics named in the folder are
  matched by name (any case) or created. Jokes can carry types (the WhatsApp import uses
  "To review" to flag everything that still needs a look).
- `craft_notes` is optional in `import.json`; craft notes whose name is already in JokeBox are
  skipped, and new ones sort after the ones you have.
- The folder is made on a laptop from an export (the WhatsApp self-chat, for one). It holds real
  material, so it stays in `~/Downloads` and `.gitignore` covers WhatsApp exports.

## Trash: `/trash`

Like a Mac's Trash. A line says things wait 30 days. Chips filter by kind (All, Jokes, Rewrites,
Observations, Brainstorms, Voice notes, Shows, Analyses, Watchlist, Craft notes), each with its
count; All shows a heading per kind. Each row: the title (a show adds its date), a detail line
(a joke's rewrites, a rewrite's joke, a routine's comic, a voice note's tags), "Deleted 22 Oct
2026, 27 days left", **Put back** and a ✕ to delete now. **Empty Trash** sits top right while
anything's there. Empty: "Trash is empty".
