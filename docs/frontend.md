# Frontend architecture

How the React app handles server data, offline saves, voice recording and the service worker.
The overall system is in [architecture.md](architecture.md).

## Server state vs UI state
Data from the API lives in TanStack Query ([queryClient.ts](../web/src/api/queryClient.ts)), never
in `useState`. Each resource has a hooks file (`api/library.ts`, `api/shows.ts`, ...) exposing
`useJokes()`, `useSetlistActions()` and so on. `useState` is only for UI: whether a sheet is open, or
a draft being typed.

**When lists refetch:** a list counts as fresh for 5 minutes (`staleTime`). Coming back to the app,
opening a screen or reconnecting refetches only lists older than that, so a quick switch to
another app and back doesn't reload everything. Your own saves refresh what they touch right away
(`refreshWhenSynced`), and a change made on another device shows up within about 5 minutes of
coming back. Each refetch is a server call, and Vercel's Hobby plan caps the month's CPU, so this
was raised from 30 seconds in November 2026. The Trash always refetches when opened.

**Lists asked for together go as one request** ([batch.ts](../web/src/api/batch.ts)): list GETs
made within 10 ms of each other are sent as one `POST /api/batch`, and each still settles as if
fetched alone (its data, or the same error). On Vercel each request that finds no server awake
starts its own copy, and each start costs CPU against the Hobby plan, so one app open used to
start about 13. Lists asked for while the account check (`/api/me`) is on its way wait for its
answer, so they reach the copy it woke. A GET made on its own, a save, or anything with an id
goes out as before; a batch the server doesn't answer properly is fetched one list at a time.
The voice outbox refreshes the voice notes list only after a pass that uploaded something: it
runs at every launch and return online, and an empty pass used to send that list alone.

**Refreshing on demand:** pull down at the top of a screen, by touch
([usePullToRefresh.ts](../web/src/layout/usePullToRefresh.ts)) or with a trackpad swipe
([useWheelPull.ts](../web/src/layout/useWheelPull.ts)); see [refresh.ts](../web/src/api/refresh.ts)
and [Refresh.tsx](../web/src/layout/Refresh.tsx). A trackpad swipe must start with the page
already at the top and run about four times as far as a finger, so a flick that scrolls up to the
top (or its momentum) never refreshes; it refreshes once the wheel events stop. It first
sends any waiting saves (up to 8 seconds, so a stuck one can't hold it up), then invalidates every
query: lists on screen refetch at once, the rest when next opened. Offline it fetches nothing and
says so. The gesture's rules (where a pull may start, how far is enough) are in
[pull.ts](../web/src/lib/pull.ts); its listeners are passive, and a touch something else already
cancelled (the brainstorm canvas, a dragged card) is ignored.

## Client-generated ids and upserts
New rows get their UUID in the browser (`crypto.randomUUID()`) and are saved with
`PUT /api/<resource>/<id>`, which creates or updates. A save retried after a dropped connection
therefore never makes a duplicate. That's what makes the offline queue safe.

## Optimistic updates and the offline queue
Saving and deleting jokes, premises, clusters, observations (and linking one to what came from
it), brainstorm sessions, shows, sets, set label fields, rewrites, voice note details, watchlist
routines, analyses, craft notes, the joke board and the Trash's restore and erase are registered as **mutation defaults**
under fixed keys (`setMutationDefaults`), each spreading the shared `QUEUED` options from
[sync.ts](../web/src/api/sync.ts).

- **Saving updates the screen at once:** `onMutate` writes the change into the cached list before
  the server answers. Sheets close straight away, signal or not; a save the server later refuses
  shows a "Not saved" toast (screens use `mutateAsync().catch`, which still fires after the
  sheet has closed).
- **Offline, the save pauses:** `networkMode: 'online'` makes TanStack Query hold it, and the
  persister writes it to IndexedDB with the rest of the cache (`throttleTime` 300 ms).
- **Saved before the phone puts the app away:** iOS often skips `pagehide` when you switch apps
  or lock the phone, so every editor (joke, set, premise, brainstorm session) also sends its
  waiting change on `visibilitychange` to hidden (`onHide` in
  [saveOnHide.ts](../web/src/lib/saveOnHide.ts)), and the saved copy is then written straight to
  IndexedDB (`saveNow` in [persist.ts](../web/src/api/persist.ts)), not after the throttle, which
  may still be waiting when the app is frozen.
- **One at a time, in order:** every queued save shares `scope: { id: 'sync' }`, so they reach the
  server in the order you made them. Two
  quick edits to one joke can't land the wrong way round.
- **One waiting copy per brainstorm session:** a session autosaves its whole self (text and
  handwriting) at every pause, so offline each pause used to queue another full copy. Its save
  now drops that session's older saves that haven't been sent yet (`dropOlderWaiting` in
  sync.ts): the newest copy holds everything they did. A save already on its way is left alone.
- **Brainstorm sessions in pieces:** the list (`session-list`) comes without ink; each session's
  ink is its own query (`['session-detail', id]`, never garbage-collected) so it stays on the
  phone. That ink is kept under its own IndexedDB key per session
  ([sessionStore.ts](../web/src/api/sessionStore.ts)), not in the saved copy of the cache: the
  saved copy is rewritten whole at every change, and with all the handwriting in it each write
  was megabytes (typing lagged). A session is written alone when it changes and read back at
  launch (`sessionsRestored`, which the session queries wait for). `keepOnDevice` in [sessions.ts](../web/src/api/sessions.ts) downloads, one at a time,
  each session whose `updated_at` moved on, but never while saves are waiting (it would fetch
  the server's older copy). An open session isn't refetched while its own save waits either, and
  once saved the copy kept is what was saved, with the server's time
  ([sessionSaves.ts](../web/src/api/sessionSaves.ts)): stamping that time on whatever copy was
  there let an older one pass for current. A session listed but not on this device yet opens to
  "This session isn't on this device yet" rather than an empty editor, whose autosave would wipe
  its pages.
- **Sessions the server would refuse:** [sessionLimits.ts](../web/src/api/sessionLimits.ts)
  splits a stroke longer than 5,000 points into joined pieces, and a session over 10,000 strokes
  (or a title over 200 characters) is refused before it's sent, with a note on the session page.
  `api()` refuses any body over the host's 4.5 MB the same way, without uploading it. Before,
  each autosave sent it again and Couldn't sync kept a full copy of the ink per try; now that list
  keeps one entry per thing saved.
- **Retries:** a save that never reached the server is retried (pausing while offline, which
  costs no tries) up to 20 times while the server answers `/health`, so one stuck request can't
  hold up the queue forever. A 5xx, 408 or 429 gets three more tries. A 401 (the sign-in ran out)
  waits, retrying each minute, until you sign in again. Vercel's bot checkpoint (a 403 with
  `x-vercel-mitigated`) waits the same way (`CheckpointError` in client.ts): it lifts once a normal
  tab passes the check, so it isn't a refusal. Any other refusal stops.
- **Nothing refused is lost:** a queued save that fails for good goes, with its variables, to the
  **Couldn't sync** list ([unsynced.ts](../web/src/api/unsynced.ts), its own IndexedDB key) via
  the `MutationCache` `onError`. A strip above every page opens it, with Retry, Copy and Discard.
  When a later save of the same thing goes through (`onSuccess`), its entry leaves the list: each
  save sends the whole thing, so the newer one carries it, and a Retry would otherwise put the
  older text back over the newer with this device's own version as its base (no clash). Signing
  out counts these, and recordings that failed to upload, in its warning, since it wipes them.
  "Reload a fresh copy" keeps this device's own version chains and moved sessions.
- **Written-at times:** new jokes, premises, observations, voice notes and craft notes send `created_at`, so
  something written offline keeps the time it was written; the server keeps it on create only and
  caps it at now.
- **Edits on two devices (jokes):** every joke has a `version`. A save sends the version it was
  edited from as `base_version`: the input carries it (`toInput` keeps the version of the joke the
  editor opened), not the cached list, which a refresh moves on to the other device's edit while
  the editor still shows the old text. Only this device's own answers move it on (the chain of
  own versions in [jokeSaves.ts](../web/src/api/jokeSaves.ts), kept with the cache), so a run of
  autosaves never clashes with itself. If the joke moved on elsewhere and the save would change
  it, the server answers 409 and the edit goes to Couldn't sync, where **Keep mine** resends it
  without the check. Resending the very same edit is never a clash, and a save that changes
  nothing (Save with no edit, a word typed and deleted) doesn't move the version on, so it can't
  make another device's waiting edit clash.
- **Shows, sets, Craft notes, observations, premises and clusters go the same way** (`sendChecked` in
  ownVersions.ts), each with Couldn't sync and Keep mine. A cluster's save queues before the joke
  saves that put versions in it ([clusters.ts](../web/src/api/clusters.ts)); dissolving one shows
  as "Dissolve cluster" in Couldn't sync. Observation saves live in
  [observationSaves.ts](../web/src/api/observationSaves.ts), not queryClient.ts, which
  ownVersions.ts imports.
- **Brainstorm sessions** send `base_version` the same way, with the chain of
  own versions in [ownVersions.ts](../web/src/api/ownVersions.ts) (one per kind; the joke one
  keeps its old cache key), but a session's clash never throws a version away ([sessionClash.ts](../web/src/api/sessionClash.ts)): the
  refused edit is saved as a new session titled "… (copy, edited on two devices)", and the move is
  remembered per session and opened version, so later autosaves, a retried save and the session
  reopened from this device's copy all go to that copy. The editor shows a notice with **Open the
  copy**. A session started here is checked from its second save (`version` 0 until then).
- **On restart, saved changes replay:** the persister keeps every queued save that hasn't
  finished, including one that was mid-request when the app closed. The saved copy never expires
  (`maxAge: Infinity`; lists still drop a week after last use), and `CACHE_BUSTER` and every
  shipped key are pinned by [queuedKeys.test.ts](../web/src/api/queuedKeys.test.ts), since
  changing either would strand saves waiting on phones. `checkAccount()` runs first: if a different
  account is now signed in, the last one's waiting saves are dropped rather than filed under the
  new one. Then `resumeQueued()` restarts them all. Because the mutation function is registered by key rather than held in a closure, a save
  made before a reload can still run, and since saves are idempotent `PUT`s and deletes, sending
  one twice is harmless. This all runs in the background (`afterRestore` in
  [launch.ts](../web/src/api/launch.ts)): the provider counts the app as loading until its
  `onSuccess` returns, and while it loads no screen fetches and nothing is written back to the
  phone. Returning the replay there held the app that way until every waiting save got through,
  which on a weak signal took minutes and while signed out never ended. The refresh after the
  replay skips lists fetched since launch and doesn't restart a fetch already on its way: it used
  to, and every Home list loaded twice at each relaunch.
- **Waiting saves show again at launch:** `showWaitingSaves()` reruns each restored save's
  `onMutate`, oldest first. A save can reach the phone before its `onMutate` has shown it (that
  waits a moment for `cancelQueries`), and TanStack doesn't rerun `onMutate` for a restored save,
  so a joke editor would open on the older text and save it back over the newer one. Each
  `onMutate` sets or drops an item, so running it twice is harmless. Writing the saved copy on
  hide or handover also waits a tick so it carries the change, and an open joke editor takes a
  newer copy of its joke while nothing's been typed (`followNewer` in useAutosaveJoke.ts).
- **Afterwards, the data refreshes, once:** `onSettled` calls `refreshWhenSynced(...)`, which
  collects the keys and invalidates them only when the last queued save settles. Refetching
  earlier would show the server's older copy and make a waiting change seem to vanish. On
  reconnect TanStack also resumes saves before it refetches queries. A successful wording-only
  joke edit refetches nothing: the answer's version and time go into the cached joke, and the
  text is what was sent. Any other edit, or a move to the Trash, of a joke in a cluster also
  refreshes the clusters, since the server may have handed the lead on. A set's save puts the server's answer (the set as it now shows) into the
  list when nothing else of that set waits, and refreshes venues only for a venue the list
  lacks. Refetching all jokes or sets at every autosave pause was most of the app's data
  transfer. Structural edits and failed saves still refresh related lists.

Anything not queued (renaming a topic, deleting a venue) uses the default
`networkMode: 'always'` with no retries: offline it fails at once with "You're offline" instead
of spinning.

### Knowing when we're offline
[network.ts](../web/src/api/network.ts) drives TanStack's `onlineManager`. It starts from
`navigator.onLine`, so flight mode counts as offline from the first moment. The phone's flag
isn't enough on its own, though: one bar in a basement, or wifi with no internet, says online
while every request fails. So `api()` gives each request 20 seconds (a big upload a second more
per 50 KB, up to two minutes, so a session full of handwriting gets through), and a request that never
reaches the server (`TypeError` or a timeout) calls `lostConnection()`: we count as offline and
ask `/health` every 10 seconds, on the `online` event and when the app comes back to the front,
until it answers. The sync light and the voice outbox follow the same flag.

Wifi with a sign-in page (venues, cafés) answers with its own page until you sign in. So the
`/health` check needs our own JSON `{"status": "ok"}`, and in `api()` a reply redirected to
another origin, a 511, or a 200 that isn't JSON counts as no connection: the save waits.

The cache is what lets the app open offline. `RequireAuth` uses the cached profile when the
network is down, but a 401 beats it: the sign-in ran out, so it goes to sign in (the login page
says how many changes are waiting). Signing out warns when changes haven't synced, then wipes
them with everything else on the phone.

### One tab at a time
Two tabs would keep separate queues and overwrite each other's saved copy.
[oneTab.ts](../web/src/lib/oneTab.ts): the open tab holds a Web Lock. A new tab that finds it
held posts a claim on a BroadcastChannel; the open tab sends every editor's waiting change
(`flushAll`), writes the saved copy straight away (`saveNow`: the throttled persister could
return before writing), answers, and reloads into "Open in another tab" with **Use it here**.
Only then does the new tab restore the cache and start the voice outbox (`startOutbox`), so it
can't take a recording still going in the other tab. From the answer on, the old tab is handed
over (`handedOver()`): it writes nothing more to the saved copy and sends nothing, so a late write
can't land over the new tab's. A tab the browser froze can't answer; the new tab takes the lock
after 2 seconds, and when the frozen one wakes it finds the lock gone and steps aside the same way.

**Several tabs** (account menu, or **Keep both open** on that screen) turns this off for one
browser (`localStorage`). Each tab then holds the lock shared, only so a new tab knows it isn't
alone: it skips recovering cut-off recordings, which may still be recording elsewhere. Uploads
from the voice outbox take a `jokebox-outbox` lock, so two tabs never send the same note at once.
Tabs still overwrite each other's saved copy, so a tab with unsynced saves asks before closing
(`useCloseWarning`). Switching it off claims the lock again and the other tabs step aside.

### Honest save messages
[announce.ts](../web/src/lib/announce.ts) waits up to 1.5 s for the server before saying "Show
logged". On one bar the phone says online while the save is really waiting, so slower than that
(or offline) it says "Saved offline, will sync".

## Autosave
Joke pages, sets and brainstorm sessions keep a local draft and save after a short pause and on
unmount (`useAutosaveJoke`, `useAutosaveSet`, `useSessionAutosave`). A ref holds the newest
values, so a delayed save writes what's on screen now.

A joke's save leaves out rows still empty (`toSend`): a tag line or alternate punch just added
and not typed in yet. The server drops blank rows, and the copy it sent back used to replace the
draft about three seconds later, taking the empty row (and the cursor) away mid-thought.

## Scroll between screens
The app is one page that never reloads, so the browser kept whatever scroll the last screen had:
open a joke from far down the list on a phone and you landed far down the joke, and "← Jokes"
dropped you somewhere else in the list. `useScrollMemory` (called once in `App`) puts the window
where a phone app would, by the rules in [scrollMemory.ts](../web/src/lib/scrollMemory.ts):

- A new screen opens at its top.
- Back (the browser's, or a swipe) returns to where that screen was left.
- A screen's own way back to its list (from `/jokes/123` to `/jokes`) returns to where the list
  was left, if it has the same filters; a differently filtered list starts at its top.
- A change to the query string alone (a filter, a sheet) leaves the scroll alone.

It sets `history.scrollRestoration` to `manual`: the browser's own attempt runs before the
screen is drawn. A screen still loading is scrolled once it's tall enough, unless you touch or
scroll first. On wide screens the open item scrolls in its own column, which `SplitView` puts
back to the top for each item opened. `GrowingText` measures itself again when its width
changes, so turning a phone or iPad no longer cuts off the last line of a setup or punchline.

## URL as state
The filters for Jokes (`?topic&sub&premise&type&status&q&sort&discarded&versions`), Premises
(`?q&topic&status&sort&discarded`), Observations (`?topic&kind&unused&status&q&sort&discarded`),
Sets (`?status`) and Voice notes (`?order`) live in the query string, so back, refresh and shared
links keep your place. The tab bar links to the bare list, so each list also remembers its filters
for an hour in that browser tab ([useRememberedParams.ts](../web/src/lib/useRememberedParams.ts),
over [sessionMemory.ts](../web/src/lib/sessionMemory.ts)) and puts them back when you arrive with
none. A param that isn't a filter, like `?new=1` for an open sheet, is passed as `transient`: never
remembered, kept as it is when the filters come back. Change filters through the hook's `update`,
not `setSearchParams`: it remembers at once, so clearing every filter is forgotten instead of
being undone by the restore. Until 24 Nov 2026 only Jokes did this, so switching tabs emptied
Premises and Observations. `/shows?log=1` opens the Log a
show sheet, which is how Home links to it, and `/shows?view=timeline|insights` picks the Shows view. Filtering, sorting and totals run in the browser, over the cached lists.

## Charts
The Timeline and Insights charts ([features/shows/insights](../web/src/features/shows/insights)) are
hand-written SVG and HTML, not a chart library: a handful of chart types didn't justify the
dependency, at the cost of more code per new chart type.
- **Pure maths, separate from drawing:** `insightMath.ts`, `timelineMath.ts` and `formMath.ts` turn
  shows into numbers and have unit tests; the components only lay them out.
- **Measured width:** `useWidth` (a `ResizeObserver`) gives SVG charts their pixel width, so lines
  stay crisp and labels thin out instead of colliding on a phone.
- **Readouts:** `useTip` gives every mark the same readout on hover and on keyboard focus;
  values that matter are also written beside the marks, so the readout only adds detail.
- **Colours** ([vizColors.ts](../web/src/features/shows/insights/vizColors.ts)) were checked for
  colour-blind safety against the dark surface: a one-hue gold ramp for ratings, and gold against
  blue at equal lightness for better or worse than your usual.

## Month headings and the time scrubber
Observations, Voice notes and Jokes (sorted by a date) group their lists by IST month with
[months.ts](../web/src/lib/months.ts) and render each month as a
[MonthSection](../web/src/components/time/MonthSection.tsx): a section with an id and a heading
that sticks under the phone's top bar. [TimeRail](../web/src/components/time/TimeRail.tsx) is the
scrubber beside them, built as an ARIA slider:
- **Jumping:** pressing or dragging picks the month at that height (months share the rail equally)
  and scrolls only the box the list lives in (the page on phones, the list column for jokes on
  desktop), never both, so the page doesn't shift.
- **Following:** a scroll listener on `window` in the capture phase hears scrolling in any box, and
  marks the last month whose heading has passed the top as current.
- **Keyboard:** arrow keys step a month, Home and End jump to either end.
On phones the lists keep a little room on the right so the scrubber never covers a row's buttons.

## Navigation config
[nav.ts](../web/src/layout/nav.ts) is the single list of screens. The desktop rail renders `NAV`;
the phone bar renders `BAR_LEFT`, the + button, the Ideas tab and More (`MORE_GROUPS`). The Ideas
tab is not in `nav.ts`: it points at Premises or Observations, whichever you used last
([ideas.ts](../web/src/layout/ideas.ts)), a per-device choice kept in `localStorage` (`jokebox.ideas`) like
the brainstorm pen, so it never syncs.

## Menus drawn outside their row

Dropdown menus (Radix) are portaled to the end of the page, but React still sends their events up
through the component that opened them. A handler on a parent sees events from inside the menu.
On 24 Nov 2026 this made the filter row ([ChipRow.tsx](../web/src/components/ui/ChipRow.tsx)),
which turns a vertical wheel into a sideways scroll, slide left whenever you scrolled down a long
Topic menu on Jokes, Premises or Observations. A handler that should only react to its own element
checks `element.contains(event.target)` first.

## Nothing may be wider than the screen

On a phone, anything wider than the screen makes the whole page wider, and Safari then lets a pinch
zoom out to show all of it. On 24 Nov 2026 a joke row did this: its details line (strength, two
types, topic, date, runtime) couldn't wrap, and with two long type names it ran 58 px past a 375 px
screen. Two guards now: rows whose parts can't shrink wrap instead (`flex-wrap`, as Premises and
Observations rows already did), and `main` in [AppShell.tsx](../web/src/layout/AppShell.tsx) has
`overflow-x: clip`, so whatever overflows next is cut at the edge instead of widening the page.
`clip`, not `hidden`: `hidden` makes `main` a scroll box and breaks the sticky headings inside it.

## Adaptive layout

- **Breakpoints:** `md` 768 px (lists go two across), `lg` 1024 px (the rail and side-by-side
  panes), `xl` 1280 px (the full rail, and the map or guide beside the list). Tailwind classes
  carry it all except the rail, whose compact state is JS ([useRail.ts](../web/src/layout/useRail.ts))
  because a per-device choice in `localStorage` can override the width.
- **`SplitView`** ([SplitView.tsx](../web/src/components/ui/SplitView.tsx)) owns the list and
  detail columns for Jokes and Premises, the full-width and close buttons, and the settle-in
  animation. Lists pass `WIDE_LIST` to go two across only while nothing is open. Observations
  uses it too. From 1280 px the list's width is set in JS (`useSplitWidth`): the open item's
  pane needs 48rem (42rem of content, its padding, a scrollbar), and the list may grow into
  whatever is left over, as a share of that spare room kept per device and list in
  `localStorage` (`jokebox.split.<noun>`). Kept as a share, one choice fits a laptop and a
  monitor. The pane's 48rem must grow if the open item's `max-w-2xl` ever does.
- **Page titles size to their column, not the screen.** `PageHead` is a container (`@container`):
  below 22rem wide its title caps at 44 px, below 19.5rem at 38 px. With an item open between
  1024 and 1279 px (iPad landscape), the list column is 22rem and its content 19rem, so screen
  breakpoints alone gave "Observations" 56 px and pushed New into the open item. Phone and laptop
  sizes are unchanged: there the caps match what the screen breakpoints already give.
- **Picker sheets:** linking anything you've written to anything else (observations with jokes
  and premises, jokes on a premise, versions in a cluster, a joke's premise and chain) opens one
  sheet ([PickSheet.tsx](../web/src/features/pickers/PickSheet.tsx)) wearing the tab's own filters
  (`JokePickSheet`, `PremisePickSheet`, `ObservationPickSheet`), not a search box. Filter state
  lives in the sheet, never the URL, and starts where the item on the page is filed. Callers render
  a sheet only while it's open, so each opening starts fresh. *Why:* with hundreds of jokes and
  observations a keyword box (three best matches) stopped finding things: you remember where a
  bit is filed long before its exact words. The cluster's Add versions sheet was the one people
  liked, so it became the pattern ([screens.md](screens.md#picker-sheets)).
- **Linking by search:** [LinkSearch.tsx](../web/src/features/observations/LinkSearch.tsx) is now
  only the brainstorm session's **Link a joke or observation** box: type, see the three best
  matches, tap to link. What's already linked still shows in the matches, dimmed with a tick, and
  a tap unlinks it (as a relation picker does in Notion).
  *Failure we hit:* the list used to close when the box lost focus. On an iPhone, touching a
  match blurs the box before the tap lands (cancelling `pointerdown` doesn't stop that on touch),
  so the list vanished under the finger and nothing linked; on a computer it worked. The list now
  closes on a tap outside it, Escape, or tabbing away, never on blur alone.
- **View transitions:** links that reshape the screen pass React Router's `viewTransition`; state
  changes go through `withTransition` ([viewTransition.ts](../web/src/lib/viewTransition.ts)).
  Moving between items in an open split doesn't fade, so it stays instant.

## Voice notes pipeline

```mermaid
flowchart LR
  Mic -->|"getUserMedia (raw: no AGC / NS / EC)"| MR[MediaRecorder<br/>1 s chunks]
  Mic --> AN[AnalyserNode] -->|RMS → dB| Meter[7-bar meter]
  MR -->|stop| Card[New voice note card]
  MR --> Outbox[("IndexedDB outbox<br/>bytes + details")]
  Outbox -->|"PUT /api/voice-notes/:id"| API
  Outbox -->|"PUT …/:id/audio (raw bytes)"| API
  API --> Blob[(Vercel Blob)]
  Outbox --> Cache[("audio cache")] --> Player["&lt;audio&gt; via object URL"]
```

- **Format:** WebM/Opus where the browser records it reliably (Chrome, Edge, Firefox), MP4/AAC on
  Safari. A format that once produced an empty file is remembered and skipped. Opus is recorded
  at 48 kbps and AAC at 64 kbps.
- **Raw microphone:** echo cancellation, noise suppression and auto gain are all off. They're built
  for calls: auto gain pumped up the room hiss in pauses, and noise suppression made voices warble.
- **Level meter:** the RMS of each frame mapped to decibels, from -60 dB (silence) to -18 dB
  (full). It's sampled every animation frame but re-rendered only every 70 ms, with a fast attack
  and a gentle 0.85 decay.
- **Size cap:** recording stops itself at about 4 MB, under the server's 4 MiB limit (itself under
  Vercel's request size cap). That's about 11 minutes of Opus or 8 of AAC.
- **While recording:** every 1 s chunk is also written to IndexedDB as it arrives
  ([inProgress.ts](../web/src/features/voice/inProgress.ts)), keyed `[note id, chunk number]`,
  and the screen is kept awake (`useWakeLock`, which reports `asking`, `held` or `refused` so
  the recorder only promises what the phone agreed to). If the phone takes the mic (the track ends or the
  recorder errors), what was recorded is filed as if stop was tapped. If the app is killed, the
  next launch puts the chunks back together as "Recovered recording", dated when it started. If the outbox write fails, its source chunks
  stay on the device for another recovery attempt.
- **Uploads time out:** a minute plus time to send at 20 KB/s (at most 15 minutes), so a stalled
  upload can't hold up the recordings behind it; a timeout counts as no connection.
- **Outbox:** every recording is saved on the device first. The details and the audio upload as two
  calls, and retry when back online. A recording made while another uploads goes in a second
  pass, and a pass cut short by a server error tries again 30 seconds later. A permanent refusal (too large, say) marks the note as failed,
  so you can delete it.
- **Playback:** notes are fetched as a Blob and played from an object URL rather than by pointing
  `<audio>` at the API. Safari only streams from servers that answer byte-range requests, and this
  also keeps the cookie on the request and works offline. A note just recorded plays straight from
  the cache.
- **Storage:** paths are always built by the server (`voice/<user_id>/<note_id>.<ext>`), never taken
  from the request. `AudioStore` is a protocol: `BlobAudioStore` on Vercel (it authenticates with
  the per-request OIDC token, so there's no key to manage), `LocalAudioStore` locally and in tests.

## PWA and the service worker

- **Manifest:** JokeBox, standalone, portrait, ink background. Icons at 192 px, 512 px and maskable
  512 px, plus iOS splash screens and a touch icon.
- **Precache:** all JS, CSS, HTML, SVG, PNG and WOFF2. Page URLs fall back to `index.html`;
  `/api`, `/auth` and `/health` always go to the network.
- **`registerType: 'prompt'`:** a new version installs in the background and waits, so the open
  app never changes under you. The update banner switches to it with one tap. It checks for one
  every hour and each time the app comes back to the front (at most once a minute): an installed
  app on a phone is mostly resumed rather than opened, and the phone pauses the hourly timer.


## When the app crashes

- **An address that isn't a page** ([NotFoundPage.tsx](../web/src/layout/NotFoundPage.tsx)): not a
  crash, but the same rule, say what happened. Any unknown URL shows "Nothing at this address"
  inside the app frame, with **Go to Home** and **Search**. It used to redirect to Home, which
  looked as if an old or mistyped link had worked. Addresses from the first version (`/bits`,
  `/studio`, `/setlist`, `/performance`) still redirect to their new pages.
- **An error screen, not a blank one** ([CrashScreen.tsx](../web/src/layout/CrashScreen.tsx)): an
  error boundary around the whole app. If a component throws while rendering, it shows "Something
  broke" with **Reload**, **Reload a fresh copy**, and the error under "What went wrong" with
  **Copy the details**.
- **An old copy repairs itself** ([recover.ts](../web/src/lib/recover.ts)): an installed app can
  outlive a release and ask for a file the release replaced. When loading a file fails that way,
  the app repairs itself once, showing "Updating JokeBox…": it removes the service worker and its
  cached files, drops the saved lists (keeping saves waiting to sync), and reloads from the
  network. It does this at most once a minute, so a crash that a repair doesn't fix shows the error
  screen instead of looping. Without signal it only reloads, since without the cached files
  there'd be no app to open; and "signal" means `/health` answered, not the phone's own flag,
  which says online on one bar. **Reload a fresh copy** checks the same way and, if the server
  can't be reached, keeps this copy and says so.
