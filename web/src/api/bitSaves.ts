/**
 * Saving and deleting jokes, queued: offline they wait on the phone and sync in order later.
 * main.tsx imports this file up front, so the defaults exist before waiting saves replay.
 */
import { api } from './client'
import { keys, queryClient, refreshWhenSynced } from './queryClient'
import { QUEUED } from './sync'
import type { Bit, BitInput } from './types'

/* ---- Offline-capable bit saves and deletes ----
 * These have defaults registered by key, so a save made offline survives a reload:
 * it is stored as a "paused mutation" and re-run with this function once back online.
 */
export type SaveBitVars = { id: string; input: BitInput }

export const saveBitKey = ['bit', 'save']
export const deleteBitKey = ['bit', 'delete']

/*
 * Edits on two devices: each save sends the version it was edited from, read from the cache when
 * it's sent (saves go one at a time, so the previous one's answer is already in). If the joke has
 * moved on elsewhere, the server refuses with 409 and the edit goes to Couldn't sync, not over the
 * other one. Each answer's version is written straight back, so quick autosaves never conflict.
 */
queryClient.setMutationDefaults(saveBitKey, {
  ...QUEUED,
  mutationFn: async ({ id, input }: SaveBitVars) => {
    const base = queryClient.getQueryData<Bit[]>(keys.bits)?.find((b) => b.id === id)?.version
    const saved = await api<Bit>(`/api/bits/${id}`, 'PUT', { ...input, base_version: base || undefined })
    await queryClient.cancelQueries({ queryKey: keys.bits }) // an older list mustn't land after this
    queryClient.setQueryData<Bit[]>(keys.bits, (old = []) => old.map((b) => (b.id === id ? { ...b, version: saved.version } : b)))
    return saved
  },
  onMutate: async ({ id, input }: SaveBitVars) => {
    // Optimistic update: show the change immediately, before the server answers.
    await queryClient.cancelQueries({ queryKey: keys.bits })
    const now = new Date().toISOString()
    queryClient.setQueryData<Bit[]>(keys.bits, (old = []) => {
      const existing = old.find((b) => b.id === id)
      const next: Bit = { ...input, id, version: existing?.version ?? 0, created_at: existing?.created_at ?? now, updated_at: now }
      return existing ? old.map((b) => (b.id === id ? next : b)) : [next, ...old]
    })
  },
  onSettled: () => refreshWhenSynced(keys.bits, keys.types, keys.statuses),
})

queryClient.setMutationDefaults(deleteBitKey, {
  ...QUEUED,
  mutationFn: (id: string) => api<void>(`/api/bits/${id}`, 'DELETE'),
  onMutate: async (id: string) => {
    await queryClient.cancelQueries({ queryKey: keys.bits })
    queryClient.setQueryData<Bit[]>(keys.bits, (old = []) => old.filter((b) => b.id !== id))
  },
  onSettled: () => refreshWhenSynced(keys.bits, keys.types, keys.brainstorms, keys.setlists),
})
