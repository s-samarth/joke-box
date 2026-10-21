/**
 * Saves for shows, sets and rewrites, queued like jokes: log a show in a basement with no signal
 * and it waits on the phone, then syncs in order once you're back. Defaults are registered by key
 * so a save made offline survives a reload; main.tsx imports this file before saves replay.
 */
import { api } from './client'
import { keys, queryClient, refreshWhenSynced } from './queryClient'
import { QUEUED } from './sync'
import type { Brainstorm, PerformanceLog, Setlist } from './types'
import type { BrainstormInput, LogInput, SetlistInput } from './shows'

export type SaveLogVars = { id: string; input: LogInput }
export type SaveSetlistVars = { id: string; input: SetlistInput }
export type SaveBrainstormVars = { id: string; input: BrainstormInput }

export const saveLogKey = ['log', 'save']
export const deleteLogKey = ['log', 'delete']
export const saveSetlistKey = ['setlist', 'save']
export const deleteSetlistKey = ['setlist', 'delete']
export const saveBrainstormKey = ['brainstorm', 'save']
export const deleteBrainstormKey = ['brainstorm', 'delete']
export const deleteBrainstormVersionKey = ['brainstorm-version', 'delete']

/** Show the change at once: replace the row with this id, or add it at the top. */
async function upsert<T extends { id: string }>(list: readonly unknown[], row: T) {
  await queryClient.cancelQueries({ queryKey: list })
  queryClient.setQueryData<T[]>(list, (old = []) => [row, ...old.filter((r) => r.id !== row.id)])
}

async function drop(list: readonly unknown[], id: string) {
  await queryClient.cancelQueries({ queryKey: list })
  queryClient.setQueryData<{ id: string }[]>(list, (old = []) => old.filter((r) => r.id !== id))
}

const now = () => new Date().toISOString()
const createdAt = <T extends { id: string; created_at: string }>(list: readonly unknown[], id: string) =>
  queryClient.getQueryData<T[]>(list)?.find((r) => r.id === id)?.created_at ?? now()

queryClient.setMutationDefaults(saveLogKey, {
  ...QUEUED,
  mutationFn: ({ id, input }: SaveLogVars) => api<PerformanceLog>(`/api/logs/${id}`, 'PUT', input),
  onMutate: ({ id, input }: SaveLogVars) =>
    upsert<PerformanceLog>(keys.logs, { ...input, id, created_at: createdAt<PerformanceLog>(keys.logs, id) }),
  onSettled: () => refreshWhenSynced(keys.logs, keys.venues),
})

queryClient.setMutationDefaults(deleteLogKey, {
  ...QUEUED,
  mutationFn: (id: string) => api<void>(`/api/logs/${id}`, 'DELETE'),
  onMutate: (id: string) => drop(keys.logs, id),
  onSettled: () => refreshWhenSynced(keys.logs, keys.venues, keys.craftNotes),
})

queryClient.setMutationDefaults(saveSetlistKey, {
  ...QUEUED,
  mutationFn: ({ id, input }: SaveSetlistVars) => api<Setlist>(`/api/setlists/${id}`, 'PUT', input),
  onMutate: ({ id, input }: SaveSetlistVars) => {
    const items = input.items.map((item, position) => ({ ...item, position }))
    return upsert<Setlist>(keys.setlists, { ...input, items, id, created_at: createdAt<Setlist>(keys.setlists, id), updated_at: now() })
  },
  onSettled: () => refreshWhenSynced(keys.setlists, keys.venues),
})

queryClient.setMutationDefaults(deleteSetlistKey, {
  ...QUEUED,
  mutationFn: (id: string) => api<void>(`/api/setlists/${id}`, 'DELETE'),
  onMutate: (id: string) => drop(keys.setlists, id),
  onSettled: () => refreshWhenSynced(keys.setlists, keys.venues),
})

// A rewrite's versions are numbered by the server, so its save isn't shown early; it still waits offline.
queryClient.setMutationDefaults(saveBrainstormKey, {
  ...QUEUED,
  mutationFn: ({ id, input }: SaveBrainstormVars) => api<Brainstorm>(`/api/brainstorms/${id}`, 'PUT', input),
  onSettled: () => refreshWhenSynced(keys.brainstorms),
})

queryClient.setMutationDefaults(deleteBrainstormKey, {
  ...QUEUED,
  mutationFn: (id: string) => api<void>(`/api/brainstorms/${id}`, 'DELETE'),
  onMutate: (id: string) => drop(keys.brainstorms, id),
  onSettled: () => refreshWhenSynced(keys.brainstorms),
})

queryClient.setMutationDefaults(deleteBrainstormVersionKey, {
  ...QUEUED,
  mutationFn: (id: string) => api<void>(`/api/brainstorm-versions/${id}`, 'DELETE'),
  onSettled: () => refreshWhenSynced(keys.brainstorms),
})
