/**
 * Saving and deleting jokes, queued: offline they wait on the phone and sync in order later.
 * main.tsx imports this file up front, so the defaults exist before waiting saves replay.
 */
import { api } from './client'
import { keys, queryClient, refreshWhenSynced } from './queryClient'
import { OLD_SAVE_KEYS } from './legacy'
import { QUEUED } from './sync'
import type { Joke, JokeInput } from './types'

/* ---- Offline-capable joke saves and deletes ----
 * These have defaults registered by key, so a save made offline survives a reload:
 * it is stored as a "paused mutation" and re-run with this function once back online.
 */
export type SaveJokeVars = { id: string; input: JokeInput }

export const saveJokeKey = ['joke', 'save']
export const deleteJokeKey = ['joke', 'delete']

/*
 * Edits on two devices: each save sends the version it was edited from, read from the cache when
 * it's sent (saves go one at a time, so the previous one's answer is already in). If the joke has
 * moved on elsewhere, the server refuses with 409 and the edit goes to Couldn't sync, not over the
 * other one. Each answer's version is written straight back, so quick autosaves never conflict.
 */
queryClient.setMutationDefaults(saveJokeKey, {
  ...QUEUED,
  mutationFn: async ({ id, input }: SaveJokeVars) => {
    const base = queryClient.getQueryData<Joke[]>(keys.jokes)?.find((b) => b.id === id)?.version
    const saved = await api<Joke>(`/api/jokes/${id}`, 'PUT', { ...input, base_version: base || undefined })
    await queryClient.cancelQueries({ queryKey: keys.jokes }) // an older list mustn't land after this
    queryClient.setQueryData<Joke[]>(keys.jokes, (old = []) => old.map((b) => (b.id === id ? { ...b, version: saved.version } : b)))
    return saved
  },
  onMutate: async ({ id, input }: SaveJokeVars) => {
    // Optimistic update: show the change immediately, before the server answers.
    await queryClient.cancelQueries({ queryKey: keys.jokes })
    const now = new Date().toISOString()
    queryClient.setQueryData<Joke[]>(keys.jokes, (old = []) => {
      const existing = old.find((b) => b.id === id)
      const next: Joke = { ...input, id, version: existing?.version ?? 0, created_at: existing?.created_at ?? now, updated_at: now }
      return existing ? old.map((b) => (b.id === id ? next : b)) : [next, ...old]
    })
  },
  onSettled: () => refreshWhenSynced(keys.jokes, keys.types, keys.statuses),
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
