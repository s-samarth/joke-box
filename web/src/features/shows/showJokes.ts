/**
 * Which jokes were done at a show and how each went. Ticking a set lists its jokes in running
 * order; a joke's record across shows is worked out here from the cached shows.
 */
import type { LogJoke, PerformanceLog, Setlist } from '../../api/types'

/** The jokes in these sets, in running order, each once. */
export function setJokes(chosen: Setlist[]): string[] {
  return [...new Set(chosen.flatMap((s) => s.items.map((i) => i.joke_id)))]
}

/**
 * The jokes after the chosen sets change: the old sets' jokes go unless you rated them or they're
 * in a set still ticked, and the new sets' jokes come in after the rest, in running order.
 */
export function swapJokes(current: LogJoke[], before: string[], after: string[]): LogJoke[] {
  const kept = current.filter((j) => j.result !== null || !before.includes(j.joke_id) || after.includes(j.joke_id))
  const have = new Set(kept.map((j) => j.joke_id))
  return [...kept, ...after.filter((id) => !have.has(id)).map((joke_id) => ({ joke_id, result: null }))]
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
