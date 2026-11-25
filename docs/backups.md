# Backups

Neon's free plan can only rewind the database 6 hours, and emptying the Trash erases for good.
So JokeBox keeps two copies of its own, for two different jobs:

| | Nightly backup | Download everything |
|---|---|---|
| **What** | The whole database (every table, the Trash included) every night; every recording in Blob on the 1st of each month | Your material: every list as JSON, each brainstorm with its handwriting, each recording |
| **When** | Every night at 21:37 UTC (03:07 in Bangalore), and whenever you run it (a run by hand includes the recordings unless you untick them) | When you tap it |
| **Where** | An encrypted file on GitHub, kept 30 days (the one from the 1st of each month, 90) | A ZIP on your device |
| **For** | Bringing the app back after a disaster | Reading, keeping, or taking your material elsewhere |

## How the nightly backup works

[.github/workflows/backup.yml](../.github/workflows/backup.yml) runs on a fresh GitHub Actions
machine:

1. `pg_dump` copies the database into one file. It leaves out Neon's own schemas (`neon_auth`,
   when a database has Neon Auth on), which the app never uses.
2. `pg_restore` loads that file into a throwaway Postgres on the same machine, and
   [scripts/backup_verify.py](../scripts/backup_verify.py) compares every table's row count with
   the live database. A missing table, or one that came back empty, stops the run. So every
   backup you keep is one that has already been restored once.
3. **On the 1st of the month, or a run by hand:** [scripts/backup_audio.py](../scripts/backup_audio.py)
   downloads every object from the Blob store, plus a manifest listing their names and sizes.
   Other nights skip this step: each recording downloaded is one Blob operation, and doing all
   of them nightly (about 450 in November 2026, and growing) would use up the Hobby plan's 10,000
   operations a month, which stops voice notes playing in the app for up to 30 days.
4. Both are packed into one `tar` file, which `age` encrypts.
5. The encrypted file is uploaded as the run's artifact. A database-only backup is kept for 30
   days; one with the recordings is kept for 90 (`jokebox-backup-monthly-...`).

**Mental model: dated photos, not a mirror.** Each night adds a new, separate backup and never
touches the older ones. If something goes wrong on the 10th, the backups from the 1st to the 9th
still hold the data from before. A run that fails keeps nothing, and the older backups stay.

**Mental model: a padlock and its key.** `age` encrypts to a *public key* (the open padlock),
which can lock but never unlock. Only the matching *private key* opens the file, and it never
leaves your laptop. That matters here because the repository is public: its Actions logs are
public, and anyone signed in to GitHub can download its artifacts. Downloading one gets them
only a locked box. For the same reason the workflow prints only counts and sizes, and it stops
before uploading anything if a secret is missing or any step fails. So there is never a partial
or unencrypted artifact.

## One-time setup

**1. Make the key pair** on your laptop (`brew install age`, or `sudo apt install age`):

```bash
age-keygen -o jokebox-backup-key.txt
```

It prints `Public key: age1...`. That line goes into GitHub. `jokebox-backup-key.txt` is the
private key: keep it in your password manager and on a USB stick. **Never commit it or paste it
into GitHub.** If you lose it, no backup can ever be opened.

**2. Get a database URL.** The safest choice is a role that can only read. In the Neon console,
open the SQL Editor on the production branch and run this, with a long random password:

```sql
CREATE ROLE jokebox_backup WITH LOGIN PASSWORD '<long random password>';
GRANT USAGE ON SCHEMA public TO jokebox_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO jokebox_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO jokebox_backup;
-- Tables that future migrations add, too: without this the backup breaks on the first new table.
-- It finds the role that owns the tables itself.
DO $$
DECLARE owner text := (SELECT tableowner FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jokes');
BEGIN
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT ON TABLES TO jokebox_backup', owner);
  EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT ON SEQUENCES TO jokebox_backup', owner);
END $$;
```

Use only letters and digits in the password: other characters have to be escaped in a URL.

Then go to **Connect**, pick that role, and turn **Connection pooling** off. Copy the
`postgresql://...` string. (You can also use the app's own production URL. The workflow accepts
`postgres://`, `postgresql://` and `postgresql+psycopg://`, and it swaps a `-pooler` host for the
direct one, since a dump can't run through the pooler. But a read-only role can never change
your data, even by mistake.)

**3. Get the Blob token.** In Vercel, open **Storage** and then the Blob store. Its token starts
with `vercel_blob_rw_`; it's the store's `BLOB_READ_WRITE_TOKEN`. Blob has no read-only token,
but the backup only lists and downloads.

**4. Add three repository secrets.** On GitHub go to **Settings → Secrets and variables →
Actions → New repository secret**:

| Secret | Value |
|---|---|
| `BACKUP_DATABASE_URL` | The URL from step 2 |
| `BACKUP_BLOB_TOKEN` | The token from step 3 |
| `BACKUP_AGE_RECIPIENT` | The `age1...` public key from step 1. To make the backup openable by more than one key, put one per line. |

The workflow never runs on pull requests, so code from a fork can't reach these secrets.

## Test it

On GitHub open **Actions → Backup → Run workflow** (on `main`). It takes a couple of minutes. A
green run has one artifact, `jokebox-backup-<run id>` (or `jokebox-backup-monthly-<run id>` when
it has the recordings: on the 1st, or a manual run with **recordings** ticked), holding one
`.tar.age` file. Every run
already restores its own dump before keeping it, so the one thing left to prove is that your key
opens it: download the artifact once and do step 1 of the restore below.

GitHub emails you when a run fails. It also turns the nightly schedule off if the repository
has no commits for 60 days; it emails before it does, and **Actions → Backup → Enable workflow**
turns it back on.

## Restore

You need `age` and a Postgres 18 client (`brew install age postgresql@18`).

1. **Download and unlock.** Open the run, download the artifact (GitHub wraps it in a `.zip`),
   then:

   ```bash
   unzip jokebox-backup-<run id>.zip
   age --decrypt --identity jokebox-backup-key.txt --output backup.tar jokebox-backup-*.tar.age
   mkdir backup && tar -C backup -xf backup.tar
   ```

   `backup/` now holds `jokebox.dump` (the database), and in a monthly backup `blob/` (the
   recordings, with `blob-manifest.json`). To get the recordings back, take them from the newest
   monthly backup; recordings made after it aren't in any backup yet.

2. **Restore the database into a new Neon branch first, never straight over production.** In
   Neon, create a branch from production (say `restore-2026-11-04`) and copy its direct URL.
   Restore into an **empty** schema, then bring it up to the current migrations. Don't
   `pg_restore --clean` over a schema newer than the backup: tables added since (such as
   `set_field_configs`) still point at the ones being dropped, so the restore fails part way and
   the next deploy's migration breaks.

   ```bash
   psql "<branch URL>" -c "drop schema public cascade; create schema public;"
   pg_restore --no-owner --no-privileges --dbname="<branch URL>" backup/jokebox.dump
   DATABASE_URL="<branch URL>" uv run alembic upgrade head
   psql "<branch URL>" -c "select count(*) from jokes"
   ```

   If the app connects as a different role from the one you restored with, grant it the schema
   again (`grant all on schema public to <role>; grant all on all tables in schema public to
   <role>;`). Once the branch looks right, point Vercel's `DATABASE_URL` at it and redeploy, or
   repeat these steps against production's direct URL at a quiet moment.

3. **Put the recordings back.** Each one goes back at its original name, which is what the
   database's `voice_notes.audio_path` holds, so the notes play again. The script checks every
   file against the manifest before it uploads anything:

   ```bash
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... uv run python scripts/restore_audio.py backup/blob
   ```

After a restore, anything written since the backup is gone, including Claude connector
sign-ins: connect Claude to JokeBox again.

## Costs and limits

- **Neon's 5 GB a month of data transfer.** `pg_dump` reads every row, so each night moves
  about the database's size. After the first run, check Neon's **Usage** page. If the dump
  size times 30 comes close to the limit (the app uses some of it too), make the backup weekly:
  set the cron in `backup.yml` to `37 21 * * 0`.
- **Vercel Blob.** A monthly run lists the store (one call per 1,000 objects) and downloads every
  recording once: one simple operation per recording, out of the Hobby plan's 10,000 a month
  (the app's own playback uses the rest), and about 25 MB of data transfer. Nightly runs don't
  touch Blob. Want recordings more often? Weekly costs about four times as much; check the Blob
  usage page first.
- **Postgres versions.** The database runs Postgres 18, and `pg_dump` 18 reads 18 and older. If
  Neon moves the project to 19, the run fails with "server version mismatch": change
  `postgresql-client-18`, the `/usr/lib/postgresql/18` paths and the `postgres:18` image in
  `backup.yml`.
- **Retention.** GitHub deletes each artifact after 30 days, or 90 for the monthly one, the
  most it allows a public repository. For anything older, download a monthly backup now and then
  and put it somewhere else, such as Google Drive. It's encrypted, so that's safe. Keep the key
  apart from it, in your password manager.

## Download everything

In the account menu, choose **Download everything**, then **Make the file**, then **Save the
file**. On a phone or iPad, Save opens the share sheet: choose **Save to Files**. The ZIP
([web/src/features/export/](../web/src/features/export/)) is built on your device from the
server's own lists. It holds:

- `README.txt`, with counts and how to read the rest.
- One JSON file per list: jokes, clusters, premises, topics, types, statuses, sets, set tags,
  set label fields, venues, shows, observations and their kinds, rewrites, Craft notes, areas and kinds, the
  watchlist, analyses, voice notes, and brainstorm sessions. Each is exactly as the API sends it
  ([api.md](api.md)).
- `brainstorm-sessions/`: each session in full, handwriting included.
- `voice-notes/`: each recording, named by date and label. One already kept on the device comes
  from there, so only the others cost a Blob operation each.

It leaves out the Trash and any changes still waiting on a device to sync, and there's no
import for it. To bring the app back, use the nightly backup. If one recording can't be
downloaded, the rest of the file is still saved, and `README.txt` lists the missing ones. If
the signal drops or you're signed out part-way, nothing is saved, and it tells you to try again.
