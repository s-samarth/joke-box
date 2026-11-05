/**
 * Saves for shows, sets and rewrites, queued like jokes: log a show in a basement with no signal
 * and it waits on the phone, then syncs in order once you're back. Defaults are registered by key
 * so a save made offline survives a reload; main.tsx imports this file before saves replay.
 */
import { api } from './client'
import { ownVersions } from './ownVersions'
import { keys, queryClient, refreshWhenSynced } from './queryClient'
import { QUEUED } from './sync'
import type { Brainstorm, PerformanceLog, Setlist } from './types'
import type { BrainstormInput, LogInput, SetlistInput } from './shows'

export type SaveLogVars = { id: string; input: LogInput }
/** `keepMine`: a clash being retried from Couldn't sync, to go over the other device's version. */
export type SaveSetlistVars = { id: string; input: SetlistInput; keepMine?: boolean }
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
  // A save that leaves out the jokes (an older app version's, waiting on a phone) keeps them.
  onMutate: ({ id, input }: SaveLogVars) => {
    const jokes = input.jokes ?? queryClient.getQueryData<PerformanceLog[]>(keys.logs)?.find((l) => l.id === id)?.jokes
    return upsert<PerformanceLog>(keys.logs, { ...input, jokes, id, created_at: createdAt<PerformanceLog>(keys.logs, id) })
  },
  onSettled: () => refreshWhenSynced(keys.logs, keys.venues),
})

queryClient.setMutationDefaults(deleteLogKey, {
  ...QUEUED,
  mutationFn: (id: string) => api<void>(`/api/logs/${id}`, 'DELETE'),
  onMutate: (id: string) => drop(keys.logs, id),
  onSettled: () => refreshWhenSynced(keys.logs, keys.venues, keys.craftNotes),
})

/*
 * A set edited on two devices goes the way of a joke (see jokeSaves.ts): the save sends the
 * version the editor opened, this device's own saves never clash with each other, and an edit
 * made from a version that moved on elsewhere is refused (409) and goes to Couldn't sync, where
 * Keep mine (`keepMine`) sends it again without the check.
 */
const ownSets = ownVersions('set-own-versions')

queryClient.setMutationDefaults(saveSetlistKey, {
  ...QUEUED,
  mutationFn: async ({ id, input, keepMine }: SaveSetlistVars) => {
    const { version: from, ...fields } = input
    const base = keepMine ? undefined : ownSets.baseFor(id, from)
    const saved = await api<Setlist>(`/api/setlists/${id}`, 'PUT', { ...fields, base_version: base })
    ownSets.record(id, from, base, saved.version)
    return saved
  },
  onMutate: ({ id, input }: SaveSetlistVars) => {
    const items = input.items.map((item, position) => ({ ...item, position }))
    const known = queryClient.getQueryData<Setlist[]>(keys.setlists)?.find((s) => s.id === id)
    const version = input.version ?? known?.version ?? 0
    return upsert<Setlist>(keys.setlists, { ...input, items, id, version, created_at: createdAt<Setlist>(keys.setlists, id), updated_at: now() })
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
