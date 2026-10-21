# Screens

Every screen: what it's for, how it's laid out on a phone and on desktop, which files build it,
and where its data comes from. Screenshots show the demo account (`uv run python -m app.seed`),
never real material.

Routes live in [App.tsx](../web/src/App.tsx). Every screen except Home loads lazily on first
visit, so the app opens fast on a phone.

## The frame

**Files:** [AppShell.tsx](../web/src/layout/AppShell.tsx), [BottomBar.tsx](../web/src/layout/BottomBar.tsx),
[nav.ts](../web/src/layout/nav.ts), [SyncLight.tsx](../web/src/layout/SyncLight.tsx),
[UpdatePrompt.tsx](../web/src/layout/UpdatePrompt.tsx), [AccountMenu.tsx](../web/src/layout/AccountMenu.tsx).

- **Desktop (≥1024 px):** a fixed left rail. It holds the wordmark, a yellow **New joke** button,
  every screen in `NAV` order, the sync light with its label, and your avatar and email.
- **Phone:** a slim header (wordmark, sync icon, avatar) and a bottom bar laid out as
  **Home · Jokes · + · Shows · More**. The **+** opens the New joke sheet. **More** opens a
  bottom sheet that groups every other screen: **Write** (Voice notes, Observations,
  Brainstorm), **Perform** (Sets) and **Study** (Watchlist, Analysis, External links). While
  you're on one of those screens, the More tab shows as the current one.
- One list in `nav.ts` feeds both the rail and the bar, so they can't drift apart.
- **Sync light:** "All changes saved", "Saving…", or "Offline, N waiting to sync". It reads
  TanStack Query's count of in-flight saves and whether the browser is online.
- **Update banner:** "A new version of JokeBox is ready", with **Update now** and **Later**.
- **Avatar menu:** Sign out, plus **Reset to demo data** when running locally.

<p>
  <img src="screenshots/phone-home.png" width="230" alt="Home on a phone">
  <img src="screenshots/phone-more.png" width="230" alt="The More sheet on a phone">
  <img src="screenshots/phone-new-joke.png" width="230" alt="The New joke sheet on a phone">
</p>

## Sign in: `/login`

[LoginPage.tsx](../web/src/features/auth/LoginPage.tsx) and
[RequireAuth.tsx](../web/src/features/auth/RequireAuth.tsx).

The page has the wordmark, three tape strips ("Write it down / Tape it to the floor / Kill") and
**Sign in with Google**. The "Sign in as the local test account" link appears only on localhost,
and the route behind it (`/auth/dev-login`) answers 404 unless `APP_ENV=local`.
`?error=not_invited` and `?error=failed` show a message.

`RequireAuth` guards every other route. It shows "Opening JokeBox…" while `/api/me` loads,
redirects to `/login` on a 401, and offers Retry when the server can't be reached. When
offline, it uses the cached profile, so the app still opens.

<img src="screenshots/phone-login.png" width="230" alt="Sign in">

## Home: `/`

[TodayPage.tsx](../web/src/features/today/TodayPage.tsx) and its siblings in `features/today/`.

The page is one column, at most 672 px wide. It opens with the daily joke nudge, then today's date
in IST and the headline **"Got something?"**, followed by these sections from top to bottom:

| Section | File | Notes |
|---|---|---|
| Daily joke nudge | `daily/DailyBanner.tsx` | Days since your last new joke: today written, a small green line with your streak; 1 or 2 days, yellow **Write a joke today**; 3 to 7, red **N days without a joke**; over a week, a dark, spooky card (a drifting ghost, a cobweb, a flickering line; still under reduced motion). Waits for the jokes to load so it never flashes the wrong state. Links to Daily joke |
| Quick capture | `QuickCapture.tsx` | Premise and punch in one box. Enter saves to Thoughts; Shift+Enter adds a new line |
| Voice notes | `TodayVoice.tsx` | The same recorder as the Voice screen, plus "All N" |
| Observations | `TodayObservations.tsx` | The observation box and the last few logged |
| Brainstorm | `TodayBrainstorm.tsx` | Start a session, or pick up the last one |
| Craft | `TodayCraft.tsx`, `craft/PathLadder.tsx` | **Path:** a small copy of the Craft staircase: the first Path note with tick boxes still open, how many are done, and the next step. When the step names minutes, it shows your most solid material on one topic (Strong and Killer jokes, by runtime) against that target. Below it, a box to save a lesson to one of your areas (chips in their colours) |
| Study | `TodayStudy.tsx` | Craft notes, watchlist progress, analyses, external links |
| Topics | `TopicFolders.tsx` | Topics as folders with live counts; tap through to a subtopic |
| Next up | (inline) | The soonest upcoming set (or the latest), its first three strips, the light bar and **Rehearse** |
| Needs work | (inline) | Up to five jokes with strength ≤ 2 or an unfinished status, weakest first |
| Last show | (inline) | Venue, date, time on stage, crowd and stars, plus **Log a show** |

<img src="screenshots/desktop-home.png" alt="Home on desktop">

## Daily joke: `/daily`

[DailyPage.tsx](../web/src/features/daily/DailyPage.tsx), [dailyMath.ts](../web/src/features/daily/dailyMath.ts),
[MonthCalendar.tsx](../web/src/features/daily/MonthCalendar.tsx).

The habit of writing at least one new joke a day. A day counts when any joke was added to JokeBox
that day (IST), however it got there, imports included with their original dates; it's read from
the jokes' created dates, so there's no separate log to fall out of step.

- **The nudge** (the same one as Home); its button focuses the box below.
- **Today's joke:** the quick capture box. Saving puts the joke in Thoughts and ticks today at once.
- **Streaks:** current (ending today, or yesterday while today is still open), longest, and days
  this month.
- **Calendar:** a month at a time, Monday first. Days with a new joke get a green tick and a count
  when there were several; today is outlined in yellow; days to come are dimmed. Arrows move
  between months. Tap a day to list its jokes, each linking to the joke.

## Jokes: `/bits` and `/bits/:bitId`

[BitsLayout.tsx](../web/src/features/bits/BitsLayout.tsx), [BitFilters.tsx](../web/src/features/bits/BitFilters.tsx),
[useBitFilters.ts](../web/src/features/bits/useBitFilters.ts), [BitPage.tsx](../web/src/features/bits/BitPage.tsx),
[BitDetails.tsx](../web/src/features/bits/BitDetails.tsx), [DetailControls.tsx](../web/src/features/bits/DetailControls.tsx),
[TagLines.tsx](../web/src/features/bits/TagLines.tsx), [BitExtras.tsx](../web/src/features/bits/BitExtras.tsx),
[useAutosaveBit.ts](../web/src/features/bits/useAutosaveBit.ts), [TopicManager.tsx](../web/src/features/bits/TopicManager.tsx),
[TypeManager.tsx](../web/src/features/bits/TypeManager.tsx).

- **List:** a search box ("Search words, tags, notes") and four menus: Topic (with subtopics), Type,
  Status, and Sort (Newest, Oldest, Recently edited, Strongest, Weakest, Longest). Each row shows the
  premise, the start of the punch, strength ticks, type dots, the topic, the date it was added (or
  last edited, under Recently edited) and the runtime. Sorted by a date, the list is grouped into
  months under pinned headings, with the time scrubber down its side ([BitList.tsx](../web/src/features/bits/BitList.tsx)).
  A joke brought in with an older date (an import) counts as last edited then, not on the day it
  arrived. The ⋯ menu has **Export as CSV** (with Created At and Edited At).
- **Layout:** like a mail app. On desktop the selected joke opens in a pane beside the list; on a
  phone it opens as its own page with a back link.
- **The joke page:** the premise and punch (in tape yellow) are edited in place, followed by tag
  lines. Below them, a row of details: Strength, Type (with Edit types), Filed under (topic and
  subtopic, with Edit topics), Status, Runs for, Clean rating, Language and Hashtags, followed by a
  Notes box. Then
  **Rewrites** (earlier sessions and **Start a rewrite**), **In sets** (with Add to a set), and
  **Delete joke**, which asks for confirmation first.
- **State:** the filters live in the URL (`?topic=&sub=&type=&status=&q=&sort=`). Filtering runs in
  the browser, so it works offline. Edits go into a local draft and save about a moment after you
  stop typing, through the offline-safe bit save.
- **Topic and type managers** are sheets for renaming and deleting across every joke. Deleting a
  topic moves its jokes to Thoughts. Renaming a type onto an existing one merges the two.

<img src="screenshots/desktop-joke.png" alt="A joke open beside the list">
<p>
  <img src="screenshots/phone-jokes.png" width="230" alt="Jokes list on a phone">
  <img src="screenshots/phone-joke.png" width="230" alt="A joke on a phone">
</p>

## New joke sheet

[CaptureProvider.tsx](../web/src/features/capture/CaptureProvider.tsx), [NewJokeForm.tsx](../web/src/features/capture/NewJokeForm.tsx),
[newBit.ts](../web/src/features/capture/newBit.ts).

The sheet is opened by **+**, by **New joke**, or by "Turn into a joke" on an observation. It
renders the same `BitDetails` controls as the joke page, but owns its own draft: one set of
controls with two owners of the state, so the two screens can't drift apart. Its buttons are
**Save and open** and **Save joke**. It's a bottom sheet on phones and a centred panel on desktop
(see `Modal`).

## Rewrite: `/bits/:bitId/rewrite`

[RewritePage.tsx](../web/src/features/bits/RewritePage.tsx), [RewriteHistory.tsx](../web/src/features/bits/RewriteHistory.tsx),
[useTimer.ts](../web/src/features/bits/useTimer.ts).

A full screen with no app frame. The top bar holds close, the timer (start, pause, reset), a word
count, **Checklists**, **+** for a new session and **Save version**. The original joke is pinned at the top, under
it an optional session name and a free-writing area. On the right are **This session** (its saved
versions) and **Earlier sessions**. `?session=<id>` reopens a past session.

**Checklists** opens the craft checklists from the areas set to show on Rewrite, in a sheet
([CraftSheet.tsx](../web/src/features/craft/CraftSheet.tsx)). Pick one from the row at the top and
tick through it; the ticks count up and don't change the note, so the next rewrite starts fresh.

<img src="screenshots/desktop-rewrite.png" alt="Rewrite">

## Observations: `/observations`

[ObservationsPage.tsx](../web/src/features/observations/ObservationsPage.tsx), [ObservationBox.tsx](../web/src/features/observations/ObservationBox.tsx),
[ObservationList.tsx](../web/src/features/observations/ObservationList.tsx), [ObservationSheet.tsx](../web/src/features/observations/ObservationSheet.tsx),
[ObservationTopicManager.tsx](../web/src/features/observations/ObservationTopicManager.tsx).

The page has a box with topic chips and **Log it**. Below it are filter tabs (All, each topic with
its count, No topic), then the list by month under pinned headings, **Newest first** or **Oldest first** (`?order=old`),
with the time scrubber down the right edge. Each row's ⋯ menu offers Edit, **Turn into a joke** and
Delete. A **Topics** button manages the observation topics, which are
separate from joke topics; deleting one keeps its observations. The filter is `?topic=` in the URL.

<img src="screenshots/desktop-observations.png" alt="Observations">

## Brainstorm: `/brainstorm` and `/brainstorm/:sessionId`

[BrainstormPage.tsx](../web/src/features/brainstorm/BrainstormPage.tsx), [SessionPage.tsx](../web/src/features/brainstorm/SessionPage.tsx),
[InkCanvas.tsx](../web/src/features/brainstorm/InkCanvas.tsx), [InkToolbar.tsx](../web/src/features/brainstorm/InkToolbar.tsx),
[ink.ts](../web/src/features/brainstorm/ink.ts), [LinkPicker.tsx](../web/src/features/brainstorm/LinkPicker.tsx),
[SessionLinks.tsx](../web/src/features/brainstorm/SessionLinks.tsx), [useSessionAutosave.ts](../web/src/features/brainstorm/useSessionAutosave.ts).

- **List:** sessions newest first, each with its date, time spent and a summary (words,
  handwriting, links), plus **New session**. **Start with a technique** lists your Craft techniques;
  tapping one opens a new session running it.
- **Session (full screen):** the timer, and a **Type / Handwrite** toggle (both are kept). Below
  them, the title, **Link jokes or observations** (shown as small cards you can open or unlink), and
  the page itself.
- **Technique** ([TechniquePanel.tsx](../web/src/features/brainstorm/TechniquePanel.tsx)): a
  session can run one of your Craft techniques. Its prompts (the list under a "Prompts" heading in
  the note) show one at a time with **Next prompt** and **Any prompt**, and **How it works** folds
  out the whole note. Without one, **Use a technique** picks one. The session keeps its technique.
- **Handwriting:** strokes are kept as points on a page 1000 units wide with A4 proportions, so they
  stay sharp at any size and redraw to fit a phone, an iPad or a laptop. Pointer Events handle the
  pen, touch and mouse with one set of handlers. Pencil pressure sets the line width. Up to 20 pages.
- **Saving:** the session autosaves a moment after you stop, and again when you leave. Nothing is
  saved until the session has some content.

<img src="screenshots/desktop-session.png" alt="A brainstorm session">

## Voice notes: `/voice`

[VoicePage.tsx](../web/src/features/voice/VoicePage.tsx), [Recorder.tsx](../web/src/features/voice/Recorder.tsx),
[useRecorder.ts](../web/src/features/voice/useRecorder.ts), [loudness.ts](../web/src/features/voice/loudness.ts),
[NewNoteCard.tsx](../web/src/features/voice/NewNoteCard.tsx), [VoiceNoteRow.tsx](../web/src/features/voice/VoiceNoteRow.tsx),
[PlayButton.tsx](../web/src/features/voice/PlayButton.tsx), [usePlayer.ts](../web/src/features/voice/usePlayer.ts),
[outbox.ts](../web/src/features/voice/outbox.ts), [audioCache.ts](../web/src/features/voice/audioCache.ts),
[useVoiceLibrary.ts](../web/src/features/voice/useVoiceLibrary.ts).

- **Recorder:** a big yellow mic. While recording, it shows the elapsed time and a 7-bar level
  meter scrolling left.
- **New voice note card:** appears as soon as you stop. It has play and scrub controls, a title, and
  hashtags, while the recording uploads in the background. **Done** files the note and
  **Delete** throws it away.
- **Library:** a search box over labels and hashtags, hashtag chips with their counts, and one row
  per note (play, label, length, date, hashtags, edit, delete), grouped by month under pinned
  headings, **Newest first** or **Oldest first** (`?order=old`), with the time scrubber down the
  right edge.
- **Storage bar:** how much of the 1 GB of free Blob storage the recordings use.

How recording, the meter, the outbox and playback work is covered in
[frontend.md](frontend.md#voice-notes-pipeline).

<img src="screenshots/desktop-voice.png" alt="Voice notes">

## Perform and study screens

Sets, Stage, Print, Shows, Watchlist, Analysis and External links are in
[screens-perform.md](screens-perform.md).
