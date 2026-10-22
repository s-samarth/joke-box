/**
 * Names from before bits were renamed jokes, so updating the app never loses work. Saves waiting
 * on a phone (queued, or in Couldn't sync) under the old key are kept for good, like every
 * shipped key (queuedKeys.test.ts). Moving a cache saved in the old shape can go after 2026-11-30.
 * The server reads the old names too (app/schemas/legacy.py).
 */
import type { QueryClient } from '@tanstack/react-query'
import { keys } from './queryClient'

/** A save's key with the old "bit" kind renamed. */
export const renamedKey = (key: readonly unknown[]): unknown[] => (key[0] === 'bit' ? ['joke', ...key.slice(1)] : [...key])

/** The old mutation keys, to register the joke save and delete defaults under them as well. */
export const OLD_SAVE_KEYS = { save: ['bit', 'save'], delete: ['bit', 'delete'] }

type Row = Record<string, unknown>
const withJokeId = (r: Row): Row => ('joke_id' in r ? r : { ...r, joke_id: r.bit_id })

/** Moves a cache saved by an older version onto the new names, before anything reads it. */
export function upgradeOldCache(client: QueryClient) {
  const old = client.getQueryData(['bits'])
  if (old && !client.getQueryData(keys.jokes)) client.setQueryData(keys.jokes, old)
  client.removeQueries({ queryKey: ['bits'], exact: true })
  client.setQueryData<Row[]>(keys.setlists, (sets) => sets?.map((s) => ({ ...s, items: (s.items as Row[]).map(withJokeId) })))
  client.setQueryData<Row[]>(keys.brainstorms, (rows) => rows?.map(withJokeId))
  client.setQueryData<Row[]>(keys.sessions, (rows) => rows?.map((r) => ('joke_ids' in r ? r : { ...r, joke_ids: r.bit_ids })))
}
