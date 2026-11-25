# Moving JokeBox to Singapore

This is a record of a move that's done. Until November 2026 the server and the database both ran
in Washington DC (`iad1`), and every request from India crossed the world and back, roughly 230
ms each way round. They now run in Singapore (`sin1`, set by `"regions"` in
[vercel.json](../vercel.json)), about 50 ms away, so each screen that waits on the server answers
3 to 4 times faster. Keep this page for the next move: the steps are the same.

**Mental model: the server and the database move together.** Each request makes several database
queries. Server and database in the same city, those are under a millisecond each. Split them
across the world, and each query pays the long trip, which is far slower than before. So the
server switched to Singapore in the same step as the database.

Neon can't move a database to another region, so the move was: make a new database in Singapore,
copy everything into it, then point the app at it. The old database stayed untouched as the way
back for a week.

What it didn't move: the voice recordings stay in Vercel Blob where they were. A recording is
fetched from there once and then plays from the phone, and uploads happen in the background, so
moving them wasn't worth the work. Claude's connector is slightly slower (Claude calls from the
US), which nobody waits on the way you wait on a screen.

Only Production has a database: previews don't deploy (see [architecture.md](architecture.md)),
so when connecting a new database, tick **Production** only.

## The steps it took

### 1. Make the new database (you, 5 minutes)

1. In Vercel, open **Storage**, then **Create Database**, then **Neon**.
2. Choose region **Singapore (sin1)**, plan **Free**, and turn **Auth** off. Name it
   `jokebox-singapore`.
3. If it offers to connect a project, **don't connect it yet**: connecting now would clash with
   the current `DATABASE_URL`. Close that step.
4. On the new database's page, open **.env.local** (or **Quickstart**), show the secret, and copy
   `DATABASE_URL`.
5. In GitHub, add it as the repository secret **`MOVE_TO_DATABASE_URL`**
   (Settings, Secrets and variables, Actions, New repository secret).

### 2. Switch over (about 10 minutes; don't save anything in the app meanwhile)

A save made after the copy but before the switch would land in the old database and not come
across. So close the app on your phone and iPad first.

1. **Copy** (Claude, or you): Actions, **Move database**, Run workflow, type `copy`. It refuses a
   database that isn't empty, copies, and checks every table's row count matches.
2. **Swap the database** (you, in Vercel Storage):
   - open `neon-carmine-flower` (the old one), **Projects**, and **Disconnect** joke-box;
   - open `jokebox-singapore`, **Connect Project**, choose joke-box, tick **Production** (only
     Production has a database), and set the prefix to **`DATABASE`**, so the app finds
     `DATABASE_URL`.
3. **Move the server** (Claude): merge the change that adds `"regions": ["sin1"]` to
   `vercel.json`. That deploys with the new database, and from Singapore.
4. **Check** (Claude): the deployment says `sin1`, `/health` answers, and the joke, show and
   premise counts match what they were.

### 3. Afterwards

1. **The backup follows the database** (you): set the GitHub secret `BACKUP_DATABASE_URL` to the
   same value as `MOVE_TO_DATABASE_URL`, then delete `MOVE_TO_DATABASE_URL`. Claude runs the
   Backup once to confirm it's reading the new database.
2. **Keep the old database for a week**, then delete `neon-carmine-flower` in Vercel Storage.

## If something goes wrong

Until you delete it, the old database is exactly as it was at the copy. To go back: reconnect
`neon-carmine-flower` with the `DATABASE` prefix (after disconnecting the new one), and revert
the `vercel.json` change. Anything written in between is only in the new database, so if you go
back after using the app, tell Claude first: those rows can be copied across.
