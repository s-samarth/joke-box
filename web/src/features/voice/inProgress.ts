/**
 * A recording in progress, written to the phone a second at a time. Until you tap stop the audio
 * otherwise lives only in memory, so the app being closed or killed mid-set (the screen locked,
 * iOS needed the memory) would lose all of it. With this, what was recorded comes back as a
 * note on the next launch.
 *
 * Each chunk is its own entry, keyed [recording id, chunk number], so saving one is a small
 * write rather than rewriting the whole recording. Chunk -1 holds the details.
 */
import { clear, createStore, delMany, entries, set } from 'idb-keyval'

const store = createStore('jokebox-voice-live', 'chunks')

type Key = [string, number]
interface Details { type: string; startedAt: number }
interface Chunk { bytes: ArrayBuffer; at: number }

export interface Interrupted {
  id: string
  audio: Blob
  seconds: number
  startedAt: Date
}

export const beginLive = (id: string, type: string, startedAt: number) =>
  set([id, -1], { type, startedAt } satisfies Details, store)

export async function saveChunk(id: string, n: number, data: Blob) {
  await set([id, n], { bytes: await data.arrayBuffer(), at: Date.now() } satisfies Chunk, store)
}

async function allFor(id?: string): Promise<[Key, Details | Chunk][]> {
  const all = (await entries<Key, Details | Chunk>(store)).filter(([k]) => Array.isArray(k))
  return id ? all.filter(([[rid]]) => rid === id) : all
}

/** The recording is safely in the outbox (or was thrown away): drop its chunks. */
export async function forgetLive(id: string) {
  await delMany((await allFor(id)).map(([k]) => k), store)
}

/** Drop everything: called once the interrupted recordings have been moved to the outbox. */
export const clearLive = () => clear(store)

/** Recordings that never reached the outbox, put back together from their chunks. */
export async function interrupted(): Promise<Interrupted[]> {
  const byId = new Map<string, { details?: Details; chunks: [number, Chunk][] }>()
  for (const [[id, n], value] of await allFor()) {
    const entry = byId.get(id) ?? { chunks: [] }
    if (n < 0) entry.details = value as Details
    else entry.chunks.push([n, value as Chunk])
    byId.set(id, entry)
  }
  return [...byId].flatMap(([id, { details, chunks }]) => {
    if (!details || !chunks.length) return []
    chunks.sort((a, b) => a[0] - b[0])
    const last = Math.max(...chunks.map(([, c]) => c.at))
    return [{ id, audio: new Blob(chunks.map(([, c]) => c.bytes), { type: details.type }), seconds: Math.max(1, Math.round((last - details.startedAt) / 1000)), startedAt: new Date(details.startedAt) }]
  })
}
