# User flows

The journeys JokeBox is built around, step by step. Screen names link to [screens.md](screens.md).

## 1. First sign-in

1. Open the site. Signed-out visitors are sent to **Sign in**.
2. Tap **Sign in with Google** and pick an account.
3. The server checks that Google has verified the email and that the email is on the allowlist.
   - **Not on the list:** you land back on Sign in with an "invite-only" message.
   - **On the list:** your account is created on first sign-in, along with the protected
     **Thoughts** topic and the six default statuses. You land on **Home**.
4. The session lasts 30 days, so reopening the app keeps you signed in.

## 2. Catch an idea in two seconds

**Typed (Home):**
1. The app opens on Home with the cursor-ready box "What's the premise?".
2. Type the premise, and the punch if you have one (Shift+Enter for a new line).
3. Press **Enter**. The joke is saved to **Thoughts** with sensible defaults (Draft status,
   strength 3) and appears in Jokes at once. A toast offers to open it.

**With details (+ button):**
1. Tap **+** in the phone bar (or **New joke** on the desktop rail).
2. The New joke sheet opens, filed under the topic you're looking at, if any.
3. Fill in as much as you want: tag lines, strength, types, topic and subtopic (new ones can
   be made on the spot), status, runtime, clean rating, language, hashtags, notes, and a
   first brainstorm.
4. **Save joke** closes the sheet; **Save and open** goes to the joke's own page.

**Out loud (voice note):**
1. Tap the yellow mic on Home or on Voice notes. The level meter shows it's hearing you.
2. Tap again to stop. The **New voice note** card appears at once: you can play it straight away,
   give it a title and hashtags while it uploads, then tap **Done** (or press Enter).
3. Offline, the recording waits on the phone and uploads when you're back online.

**Noticed something (observation):**
1. Type it into "What did you notice?" on Home or Observations, and pick a topic if you like. The
   topic stays picked for the next one.
2. Tap **Log it**.

## 2a. Write a joke every day

1. Home opens with the daily joke nudge. Yellow means today is still open; red means it's been three
   days or more; dark and spooky means over a week.
2. Tap **Write it** (or open **Daily joke**). Type a premise, and the punch if you have it, and press
   Enter. It saves to Thoughts.
3. The nudge turns into a small green line with your streak, and today gets a tick on the calendar.
4. On **Daily joke**, tap any day to see what you wrote, or page back through earlier months.

## 3. Work an observation into a joke

1. On **Observations**, open the ⋯ menu on an observation and choose **Turn into a joke**.
2. The New joke sheet opens with the observation as the premise. The observation itself stays.
3. Write the punch, file it, and save.

## 4. Rework a joke

1. Open **Jokes**. Search, or filter by topic, type and status, and sort by newest, strongest,
   weakest or longest.
2. Tap a joke. On desktop it opens beside the list; on a phone it opens as its own page.
3. Edit the words in place. Add tag lines, move the strength ticks, change type or topic. Each
   change saves on its own; the cloud icon shows "Saving…" and then "All changes saved".
4. For a deeper pass, scroll to Rewrites and choose **Start a rewrite**. The full-screen **Rewrite** page pins the
   original at the top and runs a timer. Write freely and tap **Save version** to keep a snapshot.
   Earlier versions and earlier sessions sit on the right.
5. Tap the **Checklists** icon to tick through your review questions as you go.

## 5. Brainstorm against the clock

1. On **Brainstorm**, tap **New session**, or a technique under **Start with a technique** to
   write against its prompts (tap **Next prompt** when one runs dry).
2. Start the timer. Give the session a title, then either type or switch to **Handwrite**. Both are
   kept, and you can switch at any time.
3. When handwriting, draw with Apple Pencil, a finger or a mouse. Once the page has seen a Pencil,
   fingers scroll instead of drawing, as in Notes. You get a pen, an eraser, colours and sizes,
   undo, and up to 20 pages.
4. Tap **Link jokes or observations** to attach whatever the session touches.
5. Leave whenever you like: the session saves itself.

## 6. Build a set for tonight

1. On **Sets**, tap **New set**. It opens straight away.
2. Set the show date, the slot length (for example 15:00) and the venue.
3. Add jokes from **Your jokes**, which is beside the set on desktop and behind **Add jokes** on a
   phone. Search or filter, then tap **+** (or drag on desktop). The strongest are listed first.
   Tap a joke to read it in full without leaving.
4. Reorder by dragging the handle (this works on touch) or with the arrows. Fix each joke's runtime
   on its strip.
5. Watch the light bar. It stays tape-yellow while there's room, turns amber inside the last
   minute and red when you're over. The first strip is marked **Opener** and the last **Closer**.
6. Mark a joke **optional** (the dashed circle on its strip) if you'll cut it when time is short. It
   turns to faded paper tape and leaves the total; the time it would add shows as "+N optional".
7. Rate the set with stars and tag it (In progress, Weak, Opener set, your own...). On **Sets**,
   the tag chips show only the sets with that tag.
8. There's no Save button: the set saves as you go.

## 7. Rehearse and perform

1. From the set (or from **Next up** on Home), tap **Rehearse**.
2. **Stage** mode goes full screen: the current joke on bright tape with its punch, and the rest
   dimmed. The screen stays awake.
3. Tap ▶ to start the clock. Tap the right half of the screen for the next joke and the left half to
   go back. The clock turns amber with a minute to go and red when you're over.
   Before you start, the cap icon shows **Before you go on**: crowd work, hecklers and delivery notes.
4. For paper, use the printer icon: **Print** lays out numbered jokes, each with its runtime and
   where you should be by then.

## 8. Log the show on the way home

1. Tap **Log a show** (on **Shows**, or under "Last show" on Home).
2. Choose the venue (or type a new one), how it went (1–5 stars) and how long you were on.
3. Optionally tick **the sets you did** (none, one or several). Their topics are ticked for you; time
   on stage is yours to type, since it never matches the set exactly. Then add the crowd and remarks.
4. If you recorded the set, tap **Count laughs for LPM** and count each laugh by its score. Under
   **What did you learn?**, write down the lesson: it goes to Craft, linked to this show.
5. Save. The totals on **Shows** update straight away.

## 9. Review how it's going

1. On **Shows**, pick a period (Lifetime, This month, This week) and a venue.
2. Read the four totals: number of shows, time on stage, average rating and median crowd. The
   rating is weighted by stage time, so a 20-minute set counts more than a 3-minute one.
3. **More filters** adds a date range, stars, set length and crowd size bands.
4. Sort the table by any column, and tap a row to read, edit or delete the show.
5. Use ⋯ → **Export as CSV** for a spreadsheet. Jokes have the same export.
6. Switch to **Timeline** for the mic diary (every day you went up), shows per month by rating and
   your rating over your last 10 shows.
7. Switch to **Insights** for recent form (your last 10 shows against the 10 before), each topic
   month by month, and the mix of rough, okay and great nights by topic, venue, set length and time
   slot. Anything with fewer than 7 shows isn't compared yet. The period and venue filters scope
   both views.

## 10. Study other comics

1. On **Watchlist**, the dossier's 100 routines are grouped by category, each with its SI, LD
   and DP scores. Add your own with **Add routine**.
2. Open a routine to watch it (its link, or a YouTube search). Tick the circle once you've watched it.
3. Tap the notebook icon to start an **analysis**: the name and link are filled in from the routine.
4. Analyses are listed on **Analysis**, where you can search them.
5. Learned something about doing stand-up? On **Craft**, tap **New note**, pick its kind and area,
   and write it down. Open an area's folder to see its notes as cards. Move a note with its ⋯ menu
   or the area chip on the note, and add, rename, recolour or delete areas with **New area**,
   **Arrange** and **Edit area**.

## 11. Install it on your phone

1. Open the site in Safari (iPhone) or Chrome (Android).
2. Choose Share → **Add to Home Screen** (iPhone), or the menu → **Install app** (Android).
3. It opens full screen, like a native app. When a new version ships, a banner says
   "A new version of JokeBox is ready" with **Update now** and **Later**.

## 12. Use it with no signal

1. Everything you've already opened stays readable. Each list is kept on the device for a week
   after you last opened it.
2. Saves keep working: jokes, observations, shows (with their lesson), sets, rewrites, voice
   notes and craft notes. Sheets close as usual and say "Saved offline, will sync". The cloud
   icon turns amber and says "Offline, N waiting to sync", counting recordings still to upload.
3. A weak signal counts too: a save that can't reach the server waits like an offline one, and
   the app checks every few seconds for the server to come back.
4. Closing the app is fine. Waiting saves stay on the phone, including one that was on its way.
5. Back online, the saves go up one at a time in the order you made them, then the lists
   refresh and the icon returns to "All changes saved". Things written offline keep the time
   you wrote them, so a joke written at 11:50 pm still counts for that day.
6. If the server refuses a save, it isn't lost: a strip says "1 change couldn't sync" and opens
   a list with what you wrote, and Retry, Copy and Discard. If the joke was changed on another
   device meanwhile, your edit waits there with **Keep mine** instead of overwriting the other.
7. Venue wifi that wants you to sign in counts as no signal until you do.
8. If your sign-in runs out, waiting saves stay. The app asks you to sign in, says how many
   changes are waiting, and they sync once you're back. Signing out with changes waiting asks
   first, since it deletes them.
9. Recording a set: the screen stays on. If the phone takes the mic or the app is closed, what
   was recorded is kept (after a crash it comes back as "Recovered recording").
10. A few things need a connection there and then, like renaming a topic or deleting a venue.
   Offline they say "You're offline" straight away.
11. On a phone in a browser tab, Home suggests adding JokeBox to the Home Screen: Safari can clear
   a tab's storage after a week unused, but not an installed app's.

## 13. Get back something you deleted

1. Deleting a joke, observation, brainstorm, rewrite, voice note, show, analysis, routine or
   craft note moves it to the **Trash** (in the rail, or More on a phone). Sets are deleted
   for good.
2. The Trash lists everything by kind, with a chip for each kind, and how many days each has
   left. After 30 days it's deleted for good.
3. **Put back** returns it where it was: a joke comes back with its rewrites and into its sets.
4. **Delete now** (the ✕) or **Empty Trash** deletes for good, after asking.
5. Offline, Put back and Delete now wait and sync like any save. Editing something on another
   device after it was deleted waits in "Couldn't sync" until you put it back and retry.
