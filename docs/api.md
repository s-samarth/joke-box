# API reference

A JSON API under `/api`, served from the same origin as the app. Running locally
(`APP_ENV=local`), interactive docs are at http://localhost:8000/api/docs.

## Rules that apply to every endpoint

- **Auth:** a signed `jokebox_session` cookie, set by `/auth/google/callback` (or `/auth/dev-login`
  locally). Without it, every `/api` route except `GET /health` answers **401**.
- **CSRF:** every request that isn't GET, HEAD or OPTIONS must send `X-Requested-With: jokebox`,
  or it gets **403**.
- **Ownership:** rows are always scoped to the signed-in user. Another user's id answers **404**.
- **Upserts:** most resources are created and updated with `PUT /api/<resource>/<id>`, where the
  client picks the UUID. Repeating the same request is safe.
- **Deletes** answer **204**, including when the row is already gone (so a replayed offline delete
  succeeds).
- **Lists** return the whole collection. Filtering, searching, sorting and totals happen in the
  browser, so they work offline.
- **Errors:** `{"detail": "message"}`. 409 means a name clash (for example a topic name already in
  use) and 422 means a validation error.

## System and auth

| Method | Path | Does |
|---|---|---|
| GET | `/health` | `{status, env, version}` after `SELECT 1` against the database. No auth |
| GET | `/api/me` | The signed-in user: `id, email, display_name, avatar_url, plan, env` |
| POST | `/api/dev/reseed` | Wipes the account and loads the demo data. Local only (404 otherwise) |
| GET | `/auth/google/login` | Redirects to Google (503 if `GOOGLE_CLIENT_ID` isn't set) |
| GET | `/auth/google/callback` | Finishes sign-in, then redirects to `/` or `/login?error=not_invited\|failed` |
| POST | `/auth/logout` | Clears the session |
| GET | `/auth/dev-login?email=` | Signs in without Google. Local only (404 otherwise) |

## Library

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/topics` | Topics with their subtopics; Thoughts (`is_system`) first |
| POST | `/api/topics` | `{name}` → 201. 409 on a duplicate name |
| PATCH | `/api/topics/{id}` | `{name}`. The system topic can't be renamed |
| DELETE | `/api/topics/{id}` | Moves its jokes and show links to Thoughts first. 400 for the system topic |
| POST | `/api/topics/{id}/subtopics` | `{name}` → 201 |
| PATCH | `/api/subtopics/{id}` | `{name}` |
| DELETE | `/api/subtopics/{id}` | Its jokes lose the subtopic |
| GET | `/api/types` | `[{id, name}]` |
| PATCH | `/api/types/{id}` | `{name}`. Renaming onto an existing type merges the two |
| DELETE | `/api/types/{id}` | Removed from every joke |
| GET | `/api/statuses` | In order of `position` |
| POST | `/api/statuses` | `{name}`. Returns the existing status if the name is already used |
| GET | `/api/bits` | Every joke, newest first |
| GET | `/api/bits/{id}` | One joke |
| PUT | `/api/bits/{id}` | See below. Creates any new type or status by name, and prunes types no joke uses |
| DELETE | `/api/bits/{id}` | Cascades to its rewrites and set entries |

**Joke body (`BitIn`)**

```json
{
  "setup": "required, non-empty",
  "punchline": "",
  "topic_id": "uuid (yours)",
  "subtopic_id": "uuid in that topic, or null",
  "types": ["One-Liner"],
  "status": "Draft",
  "strength": 3,
  "duration_seconds": 30,
  "hashtags": ["#dating"],
  "tag_lines": ["an extra punch"],
  "clean_rating": "clean | mild | dirty | null",
  "language": "Hinglish",
  "comments": "",
  "created_at": "optional, kept only on create (used by the importer)"
}
```

The response (`BitOut`) adds `id`, `created_at` and `updated_at`, and returns `types` and
`status` as names.

## Rewrites (Studio)

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/brainstorms` | Every rewrite session, with its `versions` |
| PUT | `/api/brainstorms/{id}` | `{bit_id, title, content, timer_seconds}`. Each save appends a version |
| DELETE | `/api/brainstorms/{id}` | |
| DELETE | `/api/brainstorm-versions/{id}` | Removes one saved version |

## Writing

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/observations` | Newest first |
| PUT | `/api/observations/{id}` | `{text, topic_id?, created_at?}`. The text must not be blank. `created_at` is kept only on create (imports) |
| DELETE | `/api/observations/{id}` | |
| GET | `/api/observation-topics` | `[{id, name}]` |
| POST | `/api/observation-topics` | `{name}` → 201 |
| PATCH | `/api/observation-topics/{id}` | `{name}` |
| DELETE | `/api/observation-topics/{id}` | Its observations keep existing, with no topic |
| GET | `/api/sessions` | Brainstorm sessions |
| PUT | `/api/sessions/{id}` | `{title, content, ink[], ink_pages, timer_seconds, bit_ids[], observation_ids[]}` |
| DELETE | `/api/sessions/{id}` | |

`ink` holds at most 10,000 strokes, each `{color, size, page, points: [[x, y, pressure], …]}`, with
up to 5,000 points per stroke and at most 20 pages. Those caps keep one session under Vercel's
4.5 MB request limit.

## Voice notes

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/voice-notes` | Newest first; `has_audio` says whether the upload has landed |
| PUT | `/api/voice-notes/{id}` | `{label, hashtags[], duration_seconds, created_at?}`. `created_at` is kept only on create (imports) |
| PUT | `/api/voice-notes/{id}/audio` | Raw bytes with `Content-Type: audio/*`. At most 4 MiB (413 over); 400 if empty; 415 if not audio |
| GET | `/api/voice-notes/{id}/audio` | The recording. `Cache-Control: private, max-age=31536000` |
| DELETE | `/api/voice-notes/{id}` | Deletes the row and the file |

On a deployment without a Blob store, these answer **503**.

## Performing

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/venues` | |
| POST | `/api/venues` | `{name}`. Returns the existing venue if the name is already used |
| GET | `/api/setlists` | Most recently edited first, with `items` and `venue_name` |
| PUT | `/api/setlists/{id}` | `{name, show_date?, target_seconds, venue_name?, items: [{bit_id, duration_seconds}]}`. The items are replaced as a whole, in the order sent |
| DELETE | `/api/setlists/{id}` | |
| GET | `/api/logs` | Every show, most recent first, with `venue_name` and `topic_ids` |
| PUT | `/api/logs/{id}` | `{venue_name, performed_at, duration_seconds, audience_size, rating 1–5, topic_ids[], notes}` |
| DELETE | `/api/logs/{id}` | |

The venue is given by name and created if it's new; it defaults to "Unidentified Venue".
Every `bit_id` and `topic_id` must belong to you (otherwise 404).

## Study

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/watchlist` | In order of `position` |
| PUT | `/api/watchlist/{id}` | `{title, comedian, category, description, url, position, schemer_index, logic_density, dark_pragmatism, watched}`. Scores are 0–10 or null |
| DELETE | `/api/watchlist/{id}` | |
| POST | `/api/watchlist/import-dossier` | Adds the dossier's routines you don't already have (matched on title and comedian). Returns the full list |
| GET | `/api/analyses` | |
| PUT | `/api/analyses/{id}` | `{title, url, body, watch_item_id?}`. The URL must be http(s) or empty |
| DELETE | `/api/analyses/{id}` | |
