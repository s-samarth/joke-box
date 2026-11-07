/**
 * Saving and deleting observations, queued: jot one down on the bus and it syncs later. The keys
 * live in queryClient.ts; main.tsx imports this file up front, so the defaults exist before
 * waiting saves replay.
 */
import { api } from './client'
import { ownVersions, sendChecked } from './ownVersions'
import { deleteObservationKey, keys, linkObservationKey, queryClient, refreshWhenSynced, saveObservationKey, type LinkObservationVars, type SaveObservationVars } from './queryClient'
import { QUEUED } from './sync'
import type { Observation } from './types'

/** Edits on two devices are checked as for jokes (see ownVersions.ts). */
const ownObservations = ownVersions('observation-own-versions')

queryClient.setMutationDefaults(saveObservationKey, {
  ...QUEUED,
  mutationFn: ({ id, input, keepMine }: SaveObservationVars) =>
    sendChecked<Observation>(ownObservations, `/api/observations/${id}`, id, input, keepMine),
  onMutate: async ({ id, input }: SaveObservationVars) => {
    await queryClient.cancelQueries({ queryKey: keys.observations })
    const now = new Date().toISOString()
    queryClient.setQueryData<Observation[]>(keys.observations, (old = []) => {
      const existing = old.find((o) => o.id === id)
      // A save doesn't carry the links, so they stay as they were (or start empty).
      const next: Observation = { premise_ids: [], joke_ids: [], ...existing, ...input, id, version: input.version ?? existing?.version ?? 0, created_at: existing?.created_at ?? now, updated_at: now }
      return existing ? old.map((o) => (o.id === id ? next : o)) : [next, ...old]
    })
  },
  onSettled: () => refreshWhenSynced(keys.observations),
})

queryClient.setMutationDefaults(deleteObservationKey, {
  ...QUEUED,
  mutationFn: (id: string) => api<void>(`/api/observations/${id}`, 'DELETE'),
  onMutate: async (id: string) => {
    await queryClient.cancelQueries({ queryKey: keys.observations })
    queryClient.setQueryData<Observation[]>(keys.observations, (old = []) => old.filter((o) => o.id !== id))
  },
  onSettled: () => refreshWhenSynced(keys.observations),
})

/** Links are their own small save: no words, no version, safe to send twice. */
queryClient.setMutationDefaults(linkObservationKey, {
  ...QUEUED,
  mutationFn: ({ id, kind, targetId, on }: LinkObservationVars) =>
    api<void>(`/api/observations/${id}/links/${kind}/${targetId}`, on ? 'PUT' : 'DELETE'),
  onMutate: async ({ id, kind, targetId, on }: LinkObservationVars) => {
    await queryClient.cancelQueries({ queryKey: keys.observations })
    const column = kind === 'premises' ? 'premise_ids' : 'joke_ids'
    queryClient.setQueryData<Observation[]>(keys.observations, (old = []) => old.map((o) => {
      if (o.id !== id) return o
      const links = (o[column] ?? []).filter((t) => t !== targetId)
      return { ...o, [column]: on ? [...links, targetId] : links }
    }))
  },
  onSettled: () => refreshWhenSynced(keys.observations),
})
