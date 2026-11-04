/**
 * Which jokes were done at a show and how each went. You add the ones you want to remember by
 * searching for them; a joke's record across shows is worked out here from the cached shows.
 */
import type { Joke, LogJoke, PerformanceLog } from '../../api/types'
import { hasAll, haystack, searchWords } from '../../lib/search'

/** At most this many jokes come up as you search for one you did. */
export const MATCHES = 3

/**
 * The jokes that match the search, best first, leaving out ones already on the show. A joke
 * whose setup holds the words beats one where they're only in the punchline, tags or notes;
 * then the most recently edited. No words, no matches: the list stays out of the way.
 */
export function findJokes(jokes: Joke[], done: LogJoke[], query: string, limit = MATCHES): Joke[] {
  const words = searchWords(query)
  if (!words.length) return []
  const have = new Set(done.map((d) => d.joke_id))
  const inSetup = (j: Joke) => hasAll(j.setup.toLowerCase(), words)
  return jokes
    .filter((j) => !have.has(j.id) && hasAll(haystack([j.setup, j.punchline, ...j.tag_lines, j.comments], j.hashtags), words))
    .sort((a, b) => Number(inSetup(b)) - Number(inSetup(a)) || b.updated_at.localeCompare(a.updated_at))
    .slice(0, limit)
}

/** A joke's record at logged shows. */
export interface ShowRecord {
  shows: number
  killed: number
  ok: number
  bombed: number
  /** When it was last done, as the show's performed_at. */
  last: string | null
}

export function showRecord(logs: PerformanceLog[], jokeId: string): ShowRecord {
  const record: ShowRecord = { shows: 0, killed: 0, ok: 0, bombed: 0, last: null }
  for (const log of logs) {
    const done = log.jokes?.find((j) => j.joke_id === jokeId)
    if (!done) continue
    record.shows += 1
    if (done.result) record[done.result] += 1
    if (!record.last || log.performed_at > record.last) record.last = log.performed_at
  }
  return record
}

/** "Done at 3 shows: 2 killed, 1 bombed", leaving out results it never had. */
export function recordLine(r: ShowRecord): string {
  const parts = (['killed', 'ok', 'bombed'] as const).filter((k) => r[k] > 0).map((k) => `${r[k]} ${k}`)
  const where = `Done at ${r.shows} ${r.shows === 1 ? 'show' : 'shows'}`
  return parts.length ? `${where}: ${parts.join(', ')}` : where
}
