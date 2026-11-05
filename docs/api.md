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
  succeeds). Most deletes move the row to the Trash (see below); organisers are erased.
- **In the Trash:** a save to a row in the Trash answers **410**. Put it back, then retry.
- **Lists** return the whole collection. Filtering, searching, sorting and totals happen in the
  browser, so they work offline.
- **Errors:** `{"detail": "message"}`. 409 means a name clash (for example a topic name already in
  use) and 422 means a validation error.

## Old names

Jokes were called bits until October 2026. Saves can wait on a phone for months, so requests
still accept the old `bit_id` and `bit_ids` for good. Responses use only the new names, and
`/api/bits` is gone. See `app/schemas/legacy.py`.

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
| GET | `/api/topics` | Topics with their subtopics, in your order; Thoughts (`is_system`) first |
| POST | `/api/topics` | `{name}` → 201, at the end. 409 on a duplicate name |
| PUT | `/api/topics/order` | `{ids}` → 204. Your topics in this order; Thoughts stays first. Unknown ids are skipped and ones left out keep their order after the rest |
| PATCH | `/api/topics/{id}` | `{name}`. The system topic can't be renamed |
| DELETE | `/api/topics/{id}` | Moves its jokes and show links to Thoughts first. 400 for the system topic |
| POST | `/api/topics/{id}/subtopics` | `{name}` → 201, at the end |
| PUT | `/api/topics/{id}/subtopics/order` | `{ids}` → 204. Same rules as topics |
| PATCH | `/api/subtopics/{id}` | `{name}` |
| DELETE | `/api/subtopics/{id}` | Its jokes lose the subtopic |
| GET | `/api/types` | `[{id, name, color}]`, colour as `#rrggbb` |
| PUT | `/api/types/color` | `{name, color}`. Works before the type exists, so a new type is coloured before its joke saves |
| PATCH | `/api/types/{id}` | `{name}`. Renaming onto an existing type merges the two |
| DELETE | `/api/types/{id}` | Removed from every joke |
| GET | `/api/statuses` | In order of `position` |
| POST | `/api/statuses` | `{name}`. Returns the existing status if the name is already used |
| GET | `/api/jokes` | Every joke, newest first |
| GET | `/api/jokes/{id}` | One joke |
| PUT | `/api/jokes/{id}` | See below. Creates any new type or status by name, and prunes types no joke uses |
| DELETE | `/api/jokes/{id}` | To the Trash, with its live rewrites; its set places are kept, hidden, and come back with it (see [Trash](#trash)) |

**Joke body (`JokeIn`)**

```json
{
  "setup": "required, non-empty",
  "punchline": "",
  "topic_id": "uuid (yours)",
  "subtopic_id": "uuid in that topic, or null",
  "types": ["One-Liner"],
  "status": "Draft",
  "strength": "1 to 5, or null for unrated (new jokes); left out, the rating is kept",
  "duration_seconds": 30,
  "hashtags": ["#dating"],
  "tag_lines": ["an extra punch"],
  "clean_rating": "clean | mild | dirty | null",
  "language": "Hinglish",
  "comments": "",
  "premise_id": "optional: the premise it rests on (yours, any topic), or null",
  "follows_id": "optional: the joke this one continues from (yours), or null to unlink",
  "created_at": "optional, kept only on create and capped at now (imports, and jokes written offline)",
  "base_version": "optional: the version this edit started from"
}
```

The answer includes `version`, which goes up by one on every save that changes the joke; a save
that changes nothing keeps it, so it never puts another device's waiting edit in a clash. With
`base_version`, a save made from an older version that would change the joke answers **409**
("This joke was changed on another device after you edited it.") rather than overwriting;
resending the same edit is fine. Without it, nothing is checked. Sets, sessions, Craft notes,
observations and premises follow the same rules.

`follows_id` links a joke to the one before it. Many jokes can follow one, so chains branch into
trees. Following itself or a joke that comes after it, or someone else's joke, answers **422**.
Left out of the body (an older app), the link is kept as it is. A link to a joke in the Trash
stays; erasing that joke for good clears it.

The response (`JokeOut`) adds `id`, `created_at` and `updated_at`, and returns `types` and
`status` as names.

### Premises

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/premises` | Every premise, in your order: `{id, topic_id, take, notes, created_at, updated_at}` |
| PUT | `/api/premises/{id}` | `{topic_id, take, notes, base_version?}`. Create or update by client id. `take` is required (up to 2,000 characters), `notes` up to 20,000. 422 for a topic that isn't yours. The answer includes `version`; with `base_version`, an edit made from an older version that would change it answers **409**, as for jokes. |
| DELETE | `/api/premises/{id}` | To the Trash. Its jokes stay, on no premise, and come back to it when it's put back (unless one moved to another premise meanwhile) |

A joke points at its premise with `premise_id`; a premise doesn't list its jokes.

## Rewrites (Studio)

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/brainstorms` | Every rewrite session, with its `versions` |
| PUT | `/api/brainstorms/{id}` | `{joke_id, title, content, timer_seconds}`. Each save appends a version |
| DELETE | `/api/brainstorms/{id}` | |
| DELETE | `/api/brainstorm-versions/{id}` | Removes one saved version |

## Writing

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/observations` | Newest first |
| PUT | `/api/observations/{id}` | `{text, topic_id?, created_at?, base_version?}`. The text must not be blank. `created_at` is kept only on create (imports). The answer includes `version`; with `base_version`, an edit made from an older version that would change it answers **409**, as for jokes. |
| DELETE | `/api/observations/{id}` | |
| GET | `/api/observation-topics` | `[{id, name}]`, in your order |
| POST | `/api/observation-topics` | `{name}` → 201, at the end |
| PUT | `/api/observation-topics/order` | `{ids}` → 204. Same rules as topics |
| PATCH | `/api/observation-topics/{id}` | `{name}` |
| DELETE | `/api/observation-topics/{id}` | Its observations keep existing, with no topic |
| GET | `/api/sessions/summaries` | Brainstorm sessions without their ink (`ink_strokes` counts it), newest first. What the app lists |
| GET | `/api/sessions/{id}` | One session with its ink, **gzip-packed** (see below). 404 if it isn't yours, is in the Trash, or doesn't exist yet |
| GET | `/api/sessions` | Every session with all its ink. Kept for older app versions only: all the ink at once outgrows the 4.5 MB response limit |
| PUT | `/api/sessions/{id}` | `{title, content, ink[], ink_pages, timer_seconds, joke_ids[], observation_ids[], technique_id?, base_version?}`, plain or gzip-packed. The technique must be your own craft note. Answers with the summary (no ink), which includes `version`. With `base_version`, an edit made from an older version that would change the session answers **409**, as for jokes; the app then keeps its edit as a new session |
| DELETE | `/api/sessions/{id}` | |

`ink` holds at most 10,000 strokes, each `{color, size, page, points: [[x, y, pressure], …]}`, with
up to 5,000 points per stroke and at most 20 pages (the app adds no more than 8; the server keeps
20 so sessions from before that still save). `x` runs to 2000 on a double-width page.

**Packed bodies** ([packed.py](../app/packed.py), [packed.ts](../web/src/api/packed.ts)): Vercel
refuses requests and responses over 4.5 MB, and a session of dense handwriting is several times
that as JSON. So a body over 64 KB is sent gzip-packed with `Content-Type:
application/x-jokebox-gzip-json` (not `Content-Encoding`, so nothing on the way unpacks or
recounts it), and `GET /api/sessions/{id}` answers the same way. Packed, about 17 pages of dense
handwriting fit. A packed body that unpacks past 64 MB is refused with 413, a damaged one with 400.

## Voice notes

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/voice-notes` | Newest first; `has_audio` says whether the upload has landed |
| PUT | `/api/voice-notes/{id}` | `{label, hashtags[], duration_seconds, created_at?}`. `created_at` is kept only on create (imports) |
| PUT | `/api/voice-notes/{id}/audio` | Raw bytes with `Content-Type: audio/*`. At most 4 MiB (413 over); 400 if empty; 415 if not audio |
| GET | `/api/voice-notes/{id}/audio` | The recording. `Cache-Control: private, max-age=31536000` |
| DELETE | `/api/voice-notes/{id}` | To the Trash; the recording is deleted only when it's erased. One whose audio never uploaded is erased at once |

On a deployment without a Blob store, these answer **503**.

## Performing

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/venues` | Each with `shows` and `sets`: how many use it |
| POST | `/api/venues` | `{name}`. Returns the existing venue if the name is already used |
| DELETE | `/api/venues/{id}?move_to=` | 409 if shows or sets use it and `move_to` is missing; with `move_to` (another of your venues), they move there first, then the venue is deleted |
| GET | `/api/setlists` | Most recently edited first, with `items` and `venue_name`. Each item's `duration_seconds` is its joke's current runtime |
| PUT | `/api/setlists/{id}` | `{name, show_date?, target_seconds, venue_name?, rating?, tag_ids[], items: [{joke_id, duration_seconds, optional}], base_version?}`. `rating` is 1–5 or null. The answer includes `version`; with `base_version`, an edit made from an older version that would change the set answers **409**, as for jokes. The items and tags are replaced as a whole, items in the order sent. An item's `duration_seconds` is stored but not shown: sets always time a joke by the joke's own runtime. Jokes in the Trash keep their places |
| DELETE | `/api/setlists/{id}` | To the Trash, with its jokes in order |
| GET | `/api/set-tags` | Your set tags, in order |
| POST | `/api/set-tags` | `{name}`. Goes last. 409 if the name is taken |
| PATCH | `/api/set-tags/{id}` | `{name}`. 409 if the name is taken |
| DELETE | `/api/set-tags/{id}` | Takes it off every set; the sets stay |
| GET | `/api/logs` | Every show, most recent first, with `venue_name`, `topic_ids` and `jokes` (`[{joke_id, result}]` in running order; jokes in the Trash left out) |
| PUT | `/api/logs/{id}` | `{venue_name, performed_at, duration_seconds, audience_size, rating 1–5, topic_ids[], notes, laughs?, jokes?}`. `laughs` is five counts of 0 or more, or null. `jokes` is up to 200 `{joke_id, result, note?}` in running order, `result` one of `bombed`, `ok`, `killed` or null, `note` a comment of up to 2,000 characters (left out, the comment there stays); each of your jokes once (repeats are dropped). Left out, the show's jokes stay as they are (saves queued by older app versions); a joke in the Trash keeps its place and result |
| DELETE | `/api/logs/{id}` | |

The venue is given by name and created if it's new; it defaults to "Unidentified Venue".
Every `joke_id` and `topic_id` must belong to you (otherwise 404).

## Study

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/watchlist` | In order of `position` |
| PUT | `/api/watchlist/{id}` | `{title, comedian, category, description, url, position, contrast, logic_density, has_a_point, watched}`. Scores are 0–10 or null |
| DELETE | `/api/watchlist/{id}` | |
| GET | `/api/craft-areas` | In your order. Makes the starting areas if you have none |
| POST | `/api/craft-areas` | `{name, description, color, screens[]}`; `color` is a preset name or `#rrggbb`. Goes last. 409 if the name is taken |
| PATCH | `/api/craft-areas/{id}` | Same body; rename, recolour, change screens |
| PUT | `/api/craft-areas/order` | `{ids[]}` in the order you want |
| DELETE | `/api/craft-areas/{id}?move_to=<id>` | Its notes move to `move_to` (or your first other area). 400 for your last area |
| GET | `/api/craft-kinds` | In order. Makes the starting four if you have none |
| POST | `/api/craft-kinds` | `{name, behaviour}`. Goes last. 409 if the name is taken |
| PATCH | `/api/craft-kinds/{id}` | Same body; changing the behaviour changes how its notes behave |
| DELETE | `/api/craft-kinds/{id}?move_to=<id>` | Its notes move to `move_to` (or your first other kind). 400 for your last kind |
| GET | `/api/craft-notes` | In order of `position`. Each note carries its kind's `behaviour` |
| PUT | `/api/craft-notes/{id}` | `{title, body, kind_id, area_id, hashtags, source, url, position, performance_log_id?, analysis_id?, created_at?, base_version?}`. The kind, area, show and analysis must be yours. `created_at` is kept only when the note is created. The answer includes `version`; with `base_version`, an edit made from an older version that would change it answers **409**, as for jokes. |
| DELETE | `/api/craft-notes/{id}` | |
| GET | `/api/analyses` | |
| PUT | `/api/analyses/{id}` | `{title, url, body, watch_item_id?}`. The URL must be http(s) or empty |
| DELETE | `/api/analyses/{id}` | |

## Trash

Jokes, rewrites, premises, observations, brainstorms, voice notes, sets, shows, analyses,
watchlist routines and craft notes wait here 30 days after they're deleted. `{kind}` is one of
`jokes`, `rewrites`, `premises`, `observations`, `brainstorms`, `voice-notes`, `sets`, `shows`,
`analyses`, `watchlist`, `craft-notes`.

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/trash` | `[{kind, id, title, detail, when, deleted_at, erase_at}]`, by kind, newest first. Erases anything older than 30 days first. A joke's rewrites aren't listed on their own; `detail` says how many go with it |
| POST | `/api/trash/{kind}/{id}/restore` | Puts it back (a joke with its rewrites, and into its sets; a premise with the jokes that rested on it). 404 once erased. 204 if it's not in the Trash |
| DELETE | `/api/trash/{kind}/{id}` | Erases it now (and a voice note's audio). Only acts on things in the Trash |
| DELETE | `/api/trash` | Empties the Trash |

## Claude connector (MCP)

`/mcp` is an [MCP](https://modelcontextprotocol.io) server, so Claude can read your JokeBox while
you write with it. It's in [app/connector/](../app/connector/) and uses the official `mcp` Python
SDK over streamable HTTP, stateless, with JSON replies: each request stands alone, which suits
serverless functions. Only `POST /mcp` is answered (a `GET` gets 405), and the server offers no
subscriptions: both would be streams that a stateless server never writes to, held open until
the function timed out.

**Sign-in** is OAuth 2.1, the way Claude's custom connectors expect, built on the SDK's OAuth
endpoints with JokeBox's own storage ([oauth.py](../app/connector/oauth.py),
[tokens.py](../app/connector/tokens.py)):

| Path | What it does |
|---|---|
| `GET /.well-known/oauth-protected-resource/mcp` | Says `/mcp` is protected and that JokeBox itself issues the tokens |
| `GET /.well-known/oauth-authorization-server` | The endpoints below, PKCE `S256`, scope `read` |
| `POST /register` | Dynamic client registration. Only Claude's callbacks (`https://claude.ai/api/mcp/auth_callback`, and the same on claude.com) and loopback addresses (`http://localhost:*`, for apps on your computer) are accepted; anything else is `400 invalid_redirect_uri` |
| `GET /authorize` | Checks the request, then sends the browser to the consent page |
| `GET/POST /oauth/consent` | Sign in (Google, or the dev sign-in locally) and Allow or Don't allow. The request travels in the address, signed and good for 10 minutes; the form is tied to you and the request |
| `POST /token` | Code for tokens (PKCE checked), or a refresh token for new ones |
| `POST /revoke` | Ends a sign-in |

- A code works once and lasts 5 minutes. Access tokens last 1 hour; refresh tokens 30 days, and
  each is replaced when used. A used refresh token keeps working for 60 seconds more, so Claude
  can retry if the reply with its replacement was lost; after that a copy stops working.
- Codes and tokens are stored only as SHA-256 hashes.
- `/mcp` without a live token is **401** with a `WWW-Authenticate` header pointing at the
  protected-resource document, which is how Claude knows to sign in.
- Locally the issuer is `http://localhost:8000`; deployed it's `PUBLIC_URL`. Without either (a
  preview with no `PUBLIC_URL`), the connector isn't served. Locally, requests from other sites
  are refused (DNS-rebinding protection), since a web page can reach localhost.

| Method | Path | Body / notes |
|---|---|---|
| GET | `/api/connections` | The apps signed in to your JokeBox (name, last used) |
| DELETE | `/api/connections/{client_id}` | Signs that app out at once: all its tokens for you go |

Every tool reads; none writes. Each sees only the user's own rows, and the Trash stays hidden.

| Tool | Returns |
|---|---|
| `jokebox_overview` | Topics and subtopics with joke counts; how many premises, sets, shows and observations; Craft areas; statuses and types |
| `search_jokes` | Jokes matching every word of the query (in the setup, punchline, tag lines, hashtags or notes; `#name` finds a hashtag), filtered by topic, subtopic, status, type, strength or premise; short versions, at most 25. `strength` is null for an unrated joke, and a `min_strength` above 1 leaves those out |
| `get_jokes` | Up to 20 jokes in full: tag lines, notes, premise, what it follows and what follows it, the sets it's in, its rewrites, and `shows`: its record at logged shows (`shows_done`, `killed`, `ok`, `bombed`, `last_done`) |
| `list_premises`, `get_premise` | Premises with their joke counts; one premise with its notes and jokes in chain order |
| `list_sets`, `get_set` | Sets with runtime against target; one set in running order (first is the opener, last the closer) with each joke's topic, premise, strength and time |
| `list_shows` | Logged shows with LPM, rating, topics, notes and `jokes` (each joke done, in running order: `id`, `setup`, `result` of killed / ok / bombed / null, `note`), and the LPM across every show that matches. `since` and `until` narrow by IST date; 25 a call, and `next_offset` says where the next page starts |
| `search_observations`, `search_brainstorms` | Observations; Brainstorms and Rewrites together, most recently changed first, by title and typed text, with how many handwritten pages each Brainstorm has (`handwritten_pages`) |
| `search_voice_notes` | Voice notes, newest first, matching every word in the label or hashtags: `id`, `label`, `hashtags`, `seconds`, `recorded` (IST date) and `uploaded`. Never the audio |
| `get_brainstorm` | Any result of `search_brainstorms` in full. A Brainstorm: a JSON block (`kind`, title, typed text, technique, linked jokes and observations, `handwritten_pages`, `pages_shown`, `more_from_page`), then "Page N" and a PNG of each handwritten page, drawn as the app shows it ([ink_image.py](../app/connector/ink_image.py)). Claude reads the handwriting from the images. Pages over a 2.5 MB budget continue with `from_page`. A Rewrite: one JSON block (`kind`, the joke's id and setup, title, typed text) |
| `search_craft`, `get_craft_notes` | Craft notes (no query lists every title); up to 10 in full |
| `search_analyses`, `get_analysis` | Analyses with the routine each is about; one in full |

A missing item or a bad id comes back as a tool error Claude can read. To try it locally, run the
app and add `http://localhost:8000/mcp` to an MCP client (for example
`claude mcp add --transport http jokebox http://localhost:8000/mcp`); it opens the consent page,
where the dev sign-in signs you in.
