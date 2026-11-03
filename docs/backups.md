# Backups

Neon's free plan can only rewind the database 6 hours, and emptying the Trash erases for good.
So JokeBox keeps two copies of its own, for two different jobs:

| | Nightly backup | Download everything |
|---|---|---|
| **What** | The whole database (every table, the Trash included) and every recording in Blob | Your material: every list as JSON, each brainstorm with its handwriting, each recording |
| **When** | Every night at 21:37 UTC (03:07 in Bangalore), and whenever you run it | When you tap it |
| **Where** | An encrypted file on GitHub, kept 30 days | A ZIP on your device |
| **For** | Bringing the app back after a disaster | Reading, keeping, or taking your material elsewhere |

## How the nightly backup works

[.github/workflows/backup.yml](../.github/workflows/backup.yml) runs on a fresh GitHub Actions
machine:

1. `pg_dump` copies the database into one file.
2. [scripts/backup_audio.py](../scripts/backup_audio.py) downloads every object from the Blob
   store, plus a manifest listing their names and sizes.
3. Both are packed into one `tar` file, which `age` encrypts.
4. The encrypted file is uploaded as the run's artifact and kept for 30 days.

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
open the SQL Editor on the production branch and run this. Use a long random password, and as
`<owner>` give the role that owns the tables (usually `neondb_owner`):

```sql
CREATE ROLE jokebox_backup WITH LOGIN PASSWORD '<long random password>';
GRANT USAGE ON SCHEMA public TO jokebox_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO jokebox_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO jokebox_backup;
-- Tables that future migrations add, too: without these lines the backup breaks on the first new table.
ALTER DEFAULT PRIVILEGES FOR ROLE <owner> IN SCHEMA public GRANT SELECT ON TABLES TO jokebox_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE <owner> IN SCHEMA public GRANT SELECT ON SEQUENCES TO jokebox_backup;
```

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
green run has one artifact, `jokebox-backup-<run id>`, holding one `.tar.age` file. Then do one
practice restore into a Neon branch (below). A backup you've never restored is a hope, not a
backup.

## Restore

You need `age` and a Postgres 17 client (`brew install age postgresql@17`).

1. **Download and unlock.** Open the run, download the artifact (GitHub wraps it in a `.zip`),
   then:

   ```bash
   unzip jokebox-backup-<run id>.zip
   age --decrypt --identity jokebox-backup-key.txt --output backup.tar jokebox-backup-*.tar.age
   mkdir backup && tar -C backup -xf backup.tar
   ```

   `backup/` now holds `jokebox.dump` (the database) and `blob/` (the recordings, with
   `blob-manifest.json`).

2. **Restore the database into a new Neon branch first, never straight over production.** In
   Neon, create a branch from production (say `restore-2026-11-04`) and copy its direct URL.
   `--clean` drops each table before loading the backup's version, so the branch ends up
   exactly as the backup was:

   ```bash
   pg_restore --clean --if-exists --no-owner --no-privileges --dbname="<branch URL>" backup/jokebox.dump
   psql "<branch URL>" -c "select count(*) from jokes"
   ```

   Once the branch looks right, run the same `pg_restore` against production's direct URL at a
   quiet moment. Or point Vercel's `DATABASE_URL` at the branch and redeploy.

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
- **Vercel Blob.** Each run lists the store (one call per 1,000 objects) and downloads every
  recording once. That counts towards Blob's data transfer: about 25 MB a night now.
- **Postgres versions.** `pg_dump` 17 reads Postgres 17 and older. If Neon moves the project to
  18, change `postgresql-client-17` and the `/usr/lib/postgresql/17` paths in `backup.yml`.
- **Retention.** GitHub deletes each artifact after 30 days. For anything older, download a
  backup now and then and keep it with the key.

## Download everything

In the account menu, choose **Download everything**, then **Make the file**, then **Save the
file**. On a phone or iPad, Save opens the share sheet: choose **Save to Files**. The ZIP
([web/src/features/export/](../web/src/features/export/)) is built on your device from the
server's own lists. It holds:

- `README.txt`, with counts and how to read the rest.
- One JSON file per list: jokes, premises, topics, types, statuses, the board, sets, set tags,
  venues, shows, observations and their topics, rewrites, Craft notes, areas and kinds, the
  watchlist, analyses, voice notes, and brainstorm sessions. Each is exactly as the API sends it
  ([api.md](api.md)).
- `brainstorm-sessions/`: each session in full, handwriting included.
- `voice-notes/`: each recording, named by date and label.

It leaves out the Trash and any changes still waiting on a device to sync, and there's no
import for it. To bring the app back, use the nightly backup. If one recording can't be
downloaded, the rest of the file is still saved, and `README.txt` lists the missing ones. If
the signal drops or you're signed out part-way, nothing is saved, and it tells you to try again.
