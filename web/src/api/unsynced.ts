/**
 * Saves that couldn't sync: the server refused them (the joke's topic was deleted on another
 * device, say), or one kept failing until it gave up. Before this they vanished with a toast.
 * Now each is kept on the phone, with what you wrote, until you retry, copy or discard it.
 *
 * Kept under its own IndexedDB key, apart from the query cache, so nothing that resets the
 * cache can drop it. Same "external store" pattern as the voice outbox.
 */
import { MutationObserver, type QueryClient } from '@tanstack/react-query'
import { get, set } from 'idb-keyval'
import { useSyncExternalStore } from 'react'
import { ApiError } from './client'
import { renamedKey } from './legacy'

export interface Unsynced {
  id: string
  key: string[]
  variables: unknown
  reason: string
  /** 409: changed on another device meanwhile. Retrying then means "keep mine". */
  status?: number
  at: string
}

const STORE_KEY = 'jokebox-unsynced'
let items: Unsynced[] = []
const listeners = new Set<() => void>()

// An async function, so a browser without IndexedDB (or a test) gets a rejection, not a throw.
const loaded = (async () => { items = (await get<Unsynced[]>(STORE_KEY)) ?? [] })().catch(() => {})

async function update(next: (current: Unsynced[]) => Unsynced[]) {
  await loaded
  items = next(items)
  listeners.forEach((l) => l())
  try {
    await set(STORE_KEY, items)
  } catch {
    // storage unavailable: the list still shows for this session
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  void loaded.then(listener)
  return () => listeners.delete(listener)
}

export const useUnsynced = () => useSyncExternalStore(subscribe, () => items)

/** A queued save failed for good. A delete of something already gone isn't worth keeping. */
export function keepUnsynced(key: readonly unknown[], variables: unknown, error: Error) {
  if (key[1] === 'delete' && error instanceof ApiError && error.status === 404) return
  const status = error instanceof ApiError ? error.status : undefined
  const entry: Unsynced = { id: crypto.randomUUID(), key: key.map(String), variables, reason: error.message, status, at: new Date().toISOString() }
  void update((current) => [...current, entry])
}

export const discardUnsynced = (id: string) => update((current) => current.filter((i) => i.id !== id))

export const clearUnsynced = () => update(() => [])

/**
 * Send it again through the same queued save. If it fails again, it comes back to the list. For a
 * clash (409) this replaces the other device's version: the list has refetched by now, so the
 * save goes out based on the latest version.
 */
export async function retryUnsynced(client: QueryClient, item: Unsynced) {
  await discardUnsynced(item.id)
  new MutationObserver<unknown, Error, unknown>(client, { mutationKey: renamedKey(item.key) }).mutate(item.variables).catch(() => {})
}

const KINDS: Record<string, string> = {
  joke: 'Joke', observation: 'Observation', session: 'Brainstorm session', watch: 'Watchlist routine',
  analysis: 'Analysis', craft: 'Craft note', log: 'Show', setlist: 'Set', brainstorm: 'Rewrite',
  'brainstorm-version': 'Rewrite version', voice: 'Voice note', board: 'Joke moved on the board',
  premise: 'Premise',
}

const TRASH: Record<string, string> = { restore: 'Put back from the Trash', erase: 'Delete from the Trash', empty: 'Empty the Trash' }

/** The fields worth showing (and copying) from a save, in reading order. */
const WORDS = ['take', 'setup', 'punchline', 'text', 'title', 'name', 'label', 'venue_name', 'notes', 'body', 'content']

/** What the item was, in words: "Joke", "Delete show", and the text you'd want to copy. */
export function summary(saved: string[], variables: unknown): { title: string; text: string } {
  const key = renamedKey(saved) as string[]
  if (key[0] === 'trash') return { title: TRASH[key[1]] ?? 'Trash', text: '' }
  if (key[0] === 'board' && key[1] === 'tidy') return { title: 'Tidy up the board', text: '' }
  const kind = KINDS[key[0]] ?? 'Change'
  if (key[1] === 'delete') return { title: `Delete ${kind.toLowerCase()}`, text: '' }
  const input = (variables as { input?: Record<string, unknown> } | null)?.input ?? {}
  const text = WORDS.map((w) => input[w]).filter((v): v is string => typeof v === 'string' && v.trim() !== '').join('\n')
  return { title: kind, text }
}
