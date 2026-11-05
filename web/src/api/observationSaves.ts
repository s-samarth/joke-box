/**
 * Saving and deleting observations, queued: jot one down on the bus and it syncs later. The keys
 * live in queryClient.ts; main.tsx imports this file up front, so the defaults exist before
 * waiting saves replay.
 */
import { api } from './client'
import { ownVersions, sendChecked } from './ownVersions'
import { deleteObservationKey, keys, queryClient, refreshWhenSynced, saveObservationKey, type SaveObservationVars } from './queryClient'
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
      const next: Observation = { ...input, id, version: input.version ?? existing?.version ?? 0, created_at: existing?.created_at ?? now, updated_at: now }
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
