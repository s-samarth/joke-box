# set-review: logging a show from its recording

**The job:** after a set, find out what landed without counting laughs by hand, and get the show
into JokeBox with its LPM and laugh timeline.

set-review is the comic's review engine. It runs on their Mac (code in the private repo
[s-samarth/set-review](https://github.com/s-samarth/set-review), with its own docs); JokeBox stores
only what it found. The recording never leaves the Mac.

## The flow

1. Record the set as a voice memo; starting early is fine.
2. In a Claude Code session (or any AI with the set-review MCP server), attach the file and say you
   performed it. If you haven't described the room, the AI asks once (people, near/far, where the
   phone was); if you don't remember, the room counts as evenly spread.
3. The engine:
   - finds **when you were on**: the host's introduction ("start clapping for …"), else your own
     voice, the loudest speech since the phone is nearest you. Only that stretch counts, so a
     recording started during another comic's set isn't your dead air;
   - transcribes it with the **Hinglish (code-mixed) Whisper model** (whisper.cpp, on the GPU);
   - hears **laughs and applause** with PANNs, a sound-event model, judged against the room's
     own level;
   - cuts the transcript into **bits at each laugh**, each quoted as you said it with the laugh
     it ended on. It never names your jokes: on stage you riff and rewrite, so a bit is what you
     said, not the written joke it resembles;
   - drafts the **review**: LPM and tally, the bits with their points, peaks, dead stretches;
   - draws the **laugh map** (`laugh-map.html`), opened in the session's side panel.
4. If you want, the AI compares the full transcript (`get_transcript`) with your jokes and set
   lists in JokeBox and says what material you seem to have used and where you went off script.
   That's commentary: it never relabels bits as jokes.
5. Plain comments become notes on the show. A message tagged **"Correction:"** fixes the draft and
   retunes the engine, kept only if it agrees with all corrections so far better; every version
   can be rolled back.
6. "Log this show" with a rating: the engine calls the connector's **`log_show`**, with no jokes
   tagged. Add the jokes you did on the show in JokeBox yourself if you want them there.

## The laugh scale

The same in the engine, the show form's laugh counter ([lpm.ts](../web/src/features/shows/lpm.ts))
and the comic's **LPM rules** note in Craft. Points are by **how much of the room reacted**, not
loudness, so small rooms aren't marked down:

| Points | Label in the app | What happened |
|---|---|---|
| 1 | One or two people | A chuckle, a breath of a laugh |
| 2 | Some of the room | Some of the room laughs, briefly |
| 3 | Most of the room | A room laugh |
| 4 | Rolls on, or some applause | The laugh keeps going, or gets some clapping |
| 5 | Applause break | The room claps, or the laugh stops the set |

LPM = points ÷ minutes on stage; the bands stay (12–20 Beast, 9–12 Decent, 6–9 Poor, below 6
rough). Hand counts made before 18 Nov 2026 under the old wording (a few giggles … laughs and
applause) run about 10–20% low in small rooms. The engine's allowance for small rooms, a crowd
far back and the phone's position is in set-review's `docs/scale.md`.

## What JokeBox stores

| Where | What |
|---|---|
| `performance_logs` | The show as usual, plus `title`; `laughs` is the engine's tally |
| `performance_jokes` | Empty from set-review 0.3.0 on: the jokes you add yourself. Shows logged earlier have the engine's matched jokes, with its killed / ok / bombed in `suggested_result` |
| `show_reviews` | The laugh timeline: `{start, end, kind, points}` from stage start (earlier shows also have a `joke_id` per laugh), and `engine_version` |

The show page draws the timeline as **Laughs through the set**; on shows logged before 0.3.0 it
also notes "Engine heard: …" where the engine's result differs from yours
([screens-perform.md](screens-perform.md)). `log_show` still accepts jokes and `joke_id`s, but
set-review no longer sends them. See
[data-model.md](data-model.md) and the `log_show` row in [api.md](api.md).

## The two MCP servers

| Server | Where it runs | What it does |
|---|---|---|
| **set-review** | The comic's Mac, started by Claude Code (`claude mcp add … set-review serve`) | Hears recordings, drafts reviews, takes notes and corrections, retunes, logs |
| **JokeBox connector** (`/mcp`) | Vercel | Reads the library for everyone; `log_show` writes a show, only for a sign-in with the `shows` scope (set-review's) |

set-review signs in to the connector like Claude does (OAuth, a loopback callback on the Mac),
asking for `read shows`; the consent page says it can log shows. Claude's own connection stays
read-only.
