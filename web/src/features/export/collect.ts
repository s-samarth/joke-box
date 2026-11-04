/**
 * "Download everything": every area of your JokeBox, read from the server and put in one ZIP.
 *
 * Each list goes in as JSON, exactly as the API sends it, so nothing is lost in translation and
 * it can be read back by a script. Brainstorm sessions come one at a time with their
 * handwriting, and each voice note's recording comes as its own audio file.
 *
 * The reading is passed in (`Sources`), so tests run without a server.
 */
import { ApiError } from '../../api/client'
import { NetworkError } from '../../api/network'
import type { SessionSummary, VoiceNote } from '../../api/types'
import { textFile, zip, type ZipEntry } from '../../lib/zip'
import { readme } from './readme'

export interface Sources {
  json: (path: string) => Promise<unknown>
  audio: (id: string) => Promise<Blob>
}

export interface Progress {
  done: number
  total: number
  step: string
}

export interface Archive {
  file: Blob
  name: string
  files: number
  /** Recordings that couldn't be downloaded; the rest of the archive is complete. */
  missing: string[]
}

/** Each list: the file it goes in, the API path, and what it's called while it downloads. */
export const LISTS: [file: string, path: string, step: string][] = [
  ['jokes.json', '/api/jokes', 'Jokes'],
  ['premises.json', '/api/premises', 'Premises'],
  ['topics.json', '/api/topics', 'Topics'],
  ['types.json', '/api/types', 'Types'],
  ['statuses.json', '/api/statuses', 'Statuses'],
  ['sets.json', '/api/setlists', 'Sets'],
  ['set-tags.json', '/api/set-tags', 'Set tags'],
  ['venues.json', '/api/venues', 'Venues'],
  ['shows.json', '/api/logs', 'Shows'],
  ['observations.json', '/api/observations', 'Observations'],
  ['observation-topics.json', '/api/observation-topics', 'Observation topics'],
  ['rewrites.json', '/api/brainstorms', 'Rewrites'],
  ['craft-notes.json', '/api/craft-notes', 'Craft notes'],
  ['craft-areas.json', '/api/craft-areas', 'Craft areas'],
  ['craft-kinds.json', '/api/craft-kinds', 'Craft kinds'],
  ['watchlist.json', '/api/watchlist', 'Watchlist'],
  ['analyses.json', '/api/analyses', 'Analyses'],
  ['voice-notes.json', '/api/voice-notes', 'Voice notes'],
  ['brainstorm-sessions.json', '/api/sessions/summaries', 'Brainstorm sessions'],
]

const EXTENSIONS: Record<string, string> = { 'audio/mp4': 'm4a', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3' }

/** A file name that's safe on every system: no slashes or other reserved characters. */
export function fileName(date: string, title: string, id: string): string {
  const clean = title.replace(/[\\/:*?"<>|\p{Cc}]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60).trim()
  return [date.slice(0, 10), clean, `(${id.slice(0, 8)})`].filter(Boolean).join(' ')
}

export const audioExtension = (contentType: string) => EXTENSIONS[contentType.split(';')[0].trim().toLowerCase()] ?? 'audio'

const json = (value: unknown) => JSON.stringify(value, null, 2)

function cancelled(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Download everything was cancelled', 'AbortError')
}

/** One recording the server can't find is noted and skipped; no signal or no sign-in stops it all. */
const skippable = (e: unknown) =>
  !(e instanceof NetworkError) && !(e instanceof DOMException) && !(e instanceof ApiError && (e.status === 401 || e.status === 403))

/** Run `work` on every item, a few at a time, so a long list doesn't open dozens of requests. */
async function eachFew<T>(items: T[], work: (item: T) => Promise<void>, signal?: AbortSignal): Promise<void> {
  let next = 0
  let failed = false
  const worker = async () => {
    // Once one fails the whole download fails, so the others start nothing new.
    while (next < items.length && !failed) {
      cancelled(signal)
      try {
        await work(items[next++])
      } catch (e) {
        failed = true
        throw e
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, items.length) }, worker))
}

/**
 * Read everything and build the ZIP. Throws if a list can't be read (offline, signed out).
 * Progress stops the moment it settles: requests still in flight when one fails don't report.
 */
export async function collect(sources: Sources, onProgress: (p: Progress) => void, signal?: AbortSignal, now = new Date()): Promise<Archive> {
  let open = true
  try {
    return await gather(sources, (p) => open && onProgress(p), signal, now)
  } finally {
    open = false
  }
}

async function gather(sources: Sources, onProgress: (p: Progress) => void, signal: AbortSignal | undefined, now: Date): Promise<Archive> {
  const entries: ZipEntry[] = []
  const lists: Record<string, unknown> = {}
  let done = 0
  let total = LISTS.length
  const tick = (step: string) => onProgress({ done: ++done, total, step })
  onProgress({ done, total, step: LISTS[0][2] })
  await eachFew(LISTS, async ([file, path, step]) => {
    lists[file] = await sources.json(path)
    entries.push(textFile(file, json(lists[file])))
    tick(step)
  }, signal)
  // Keep the archive's order the same each time, whichever list answered first.
  entries.sort((a, b) => LISTS.findIndex(([f]) => f === a.name) - LISTS.findIndex(([f]) => f === b.name))

  const sessions = (lists['brainstorm-sessions.json'] ?? []) as SessionSummary[]
  const notes = ((lists['voice-notes.json'] ?? []) as VoiceNote[]).filter((n) => n.has_audio)
  total += sessions.length + notes.length
  await eachFew(sessions, async (s) => {
    const full = await sources.json(`/api/sessions/${s.id}`)
    entries.push(textFile(`brainstorm-sessions/${fileName(s.created_at, s.title, s.id)}.json`, json(full)))
    tick(`Brainstorm session ${done - LISTS.length + 1} of ${sessions.length}`)
  }, signal)

  const missing: string[] = []
  await eachFew(notes, async (n) => {
    const name = `voice-notes/${fileName(n.created_at, n.label, n.id)}.${audioExtension(n.content_type)}`
    try {
      entries.push({ name, data: new Uint8Array(await (await sources.audio(n.id)).arrayBuffer()) })
    } catch (e) {
      if (!skippable(e)) throw e
      missing.push(name)
    }
    tick(`Recording ${done - LISTS.length - sessions.length + 1} of ${notes.length}`)
  }, signal)
  cancelled(signal)

  entries.unshift(textFile('README.txt', readme(lists, now, missing)))
  const day = now.toISOString().slice(0, 10)
  return { file: zip(entries, now), name: `jokebox-${day}.zip`, files: entries.length, missing }
}
