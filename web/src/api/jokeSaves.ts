/**
 * Saving and deleting jokes, queued: offline they wait on the phone and sync in order later.
 * main.tsx imports this file up front, so the defaults exist before waiting saves replay.
 */
import { api } from './client'
import { keys, queryClient, refreshWhenSynced } from './queryClient'
import { OLD_SAVE_KEYS } from './legacy'
import { QUEUED } from './sync'
import type { Joke, JokeInput, Setlist } from './types'

/* ---- Offline-capable joke saves and deletes ----
 * These have defaults registered by key, so a save made offline survives a reload:
 * it is stored as a "paused mutation" and re-run with this function once back online.
 */
/** `keepMine`: a clash being retried from Couldn't sync, to go over the other device's version. */
export type SaveJokeVars = { id: string; input: JokeInput; keepMine?: boolean }

export const saveJokeKey = ['joke', 'save']

/*
 * Which versions this device's own saves made, per joke: saves edited from any version between
 * `from` and `to` are this device's own chain of edits, so they go out based on `to`. Kept in the
 * cache (saved on the phone with the waiting saves), so it holds across a relaunch.
 */
type Own = Record<string, { from: number; to: number }>
const ownKey = ['joke-own-versions']
queryClient.setQueryDefaults(ownKey, { gcTime: Infinity })

/** The version to send as the base of an edit made from version `from`. */
export function baseFor(id: string, from: number | undefined): number | undefined {
  const own = queryClient.getQueryData<Own>(ownKey)?.[id]
  const base = own && from !== undefined && from >= own.from && from <= own.to ? own.to : from
  return base || undefined // 0: a joke not created yet when the edit began
}

function recordOwn(id: string, from: number | undefined, base: number | undefined, version: number) {
  queryClient.setQueryData<Own>(ownKey, (all = {}) => {
    const own = all[id]
    const chained = own && base !== undefined && base === own.to
    return { ...all, [id]: { from: chained ? own.from : (from ?? 0), to: version } }
  })
}

/** A set times each joke by the joke's own runtime, as the server does: change one and every set follows. */
export const followRuntime = (sets: Setlist[], id: string, seconds: number): Setlist[] =>
  sets.map((s) => ({ ...s, items: s.items.map((i) => (i.joke_id === id ? { ...i, duration_seconds: seconds } : i)) }))
export const deleteJokeKey = ['joke', 'delete']

/*
 * Edits on two devices: each save sends the version it was edited from, carried in the input
 * (`version`, which toInput keeps from the joke the editor opened). Not the cached list's version:
 * a refresh moves that on to the other device's edit while the editor still shows the old text,
 * and the save would then go over that edit unchecked. Only this device's own answers move the
 * base on (see Own), so quick autosaves never clash with each other. If the joke has moved on
 * elsewhere, the server refuses with 409 and the edit goes to Couldn't sync, not over the other.
 */
queryClient.setMutationDefaults(saveJokeKey, {
  ...QUEUED,
  mutationFn: async ({ id, input, keepMine }: SaveJokeVars) => {
    const { version: from, ...fields } = input
    const base = keepMine ? undefined : baseFor(id, from)
    const saved = await api<Joke>(`/api/jokes/${id}`, 'PUT', { ...fields, base_version: base })
    recordOwn(id, from, base, saved.version)
    await queryClient.cancelQueries({ queryKey: keys.jokes }) // an older list mustn't land after this
    queryClient.setQueryData<Joke[]>(keys.jokes, (old = []) => old.map((b) => (b.id === id ? { ...b, version: saved.version } : b)))
    return saved
  },
  onMutate: async ({ id, input }: SaveJokeVars) => {
    // Optimistic update: show the change immediately, before the server answers.
    await queryClient.cancelQueries({ queryKey: keys.jokes })
    queryClient.setQueryData<Setlist[]>(keys.setlists, (sets) => sets && followRuntime(sets, id, input.duration_seconds))
    const now = new Date().toISOString()
    queryClient.setQueryData<Joke[]>(keys.jokes, (old = []) => {
      const existing = old.find((b) => b.id === id)
      const next: Joke = { ...input, id, version: existing?.version ?? 0, created_at: existing?.created_at ?? now, updated_at: now }
      return existing ? old.map((b) => (b.id === id ? next : b)) : [next, ...old]
    })
  },
  onSettled: () => refreshWhenSynced(keys.jokes, keys.types, keys.statuses, keys.setlists),
})

queryClient.setMutationDefaults(deleteJokeKey, {
  ...QUEUED,
  mutationFn: (id: string) => api<void>(`/api/jokes/${id}`, 'DELETE'),
  onMutate: async (id: string) => {
    await queryClient.cancelQueries({ queryKey: keys.jokes })
    queryClient.setQueryData<Joke[]>(keys.jokes, (old = []) => old.filter((b) => b.id !== id))
  },
  onSettled: () => refreshWhenSynced(keys.jokes, keys.types, keys.brainstorms, keys.setlists),
})

// Saves an older version queued under the old key go out the same way (see legacy.ts).
queryClient.setMutationDefaults(OLD_SAVE_KEYS.save, queryClient.getMutationDefaults(saveJokeKey))
queryClient.setMutationDefaults(OLD_SAVE_KEYS.delete, queryClient.getMutationDefaults(deleteJokeKey))
