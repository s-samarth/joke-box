/**
 * Clusters: versions of one joke kept together, with a lead. Queued like premises, so a cluster
 * made offline syncs before the joke saves that put versions in it. A joke joins or leaves through
 * its own save (`cluster_id`); here only the cluster's words and its lead are saved. main.tsx
 * imports this file up front, so the saves exist before waiting ones replay.
 */
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from './client'
import { ownVersions, sendChecked } from './ownVersions'
import { keys, queryClient, refreshWhenSynced } from './queryClient'
import { QUEUED } from './sync'
import type { Joke } from './types'

/** Each field left out of a save stays as stored, so picking a lead never undoes a title being typed. */
export interface ClusterInput {
  /** The core idea, in a line. Empty: the lead's setup stands in for it. */
  title?: string
  notes?: string
  /** The version you'd do tonight. Left out of a save, it stays as stored. */
  lead_joke_id?: string | null
  /** The version this edit started from, sent as the base of the save. Missing: a new one. */
  version?: number
}

export interface Cluster extends ClusterInput {
  id: string
  title: string
  notes: string
  lead_joke_id: string | null
  /** Up by one per save on the server; catches edits made on two devices. */
  version: number
  created_at: string
  updated_at: string
}

/** `keepMine`: a clash being retried from Couldn't sync, to go over the other device's version. */
export type SaveClusterVars = { id: string; input: ClusterInput; keepMine?: boolean }

const saveKey = ['cluster', 'save']
const dissolveKey = ['cluster', 'delete']

/** Edits on two devices are checked as for jokes (see ownVersions.ts). */
const own = ownVersions('cluster-own-versions')

queryClient.setMutationDefaults(saveKey, {
  ...QUEUED,
  mutationFn: ({ id, input, keepMine }: SaveClusterVars) => sendChecked<Cluster>(own, `/api/clusters/${id}`, id, input, keepMine),
  onMutate: async ({ id, input }: SaveClusterVars) => {
    await queryClient.cancelQueries({ queryKey: keys.clusters })
    const now = new Date().toISOString()
    queryClient.setQueryData<Cluster[]>(keys.clusters, (old = []) => {
      const existing = old.find((c) => c.id === id)
      const next: Cluster = { title: '', notes: '', lead_joke_id: null, ...existing, ...input, id, version: input.version ?? existing?.version ?? 0, created_at: existing?.created_at ?? now, updated_at: now }
      return existing ? old.map((c) => (c.id === id ? next : c)) : [...old, next]
    })
  },
  onSettled: () => refreshWhenSynced(keys.clusters),
})

queryClient.setMutationDefaults(dissolveKey, {
  ...QUEUED,
  mutationFn: (id: string) => api<void>(`/api/clusters/${id}`, 'DELETE'),
  onMutate: async (id: string) => {
    await Promise.all([keys.clusters, keys.jokes].map((queryKey) => queryClient.cancelQueries({ queryKey })))
    queryClient.setQueryData<Cluster[]>(keys.clusters, (old = []) => old.filter((c) => c.id !== id))
    // Its jokes stay, each on its own.
    queryClient.setQueryData<Joke[]>(keys.jokes, (old = []) => old.map((j) => (j.cluster_id === id ? { ...j, cluster_id: null } : j)))
  },
  onSettled: () => refreshWhenSynced(keys.clusters, keys.jokes),
})

export const useClusters = () => useQuery({ queryKey: keys.clusters, queryFn: () => api<Cluster[]>('/api/clusters') })
export const useSaveCluster = () => useMutation<Cluster, Error, SaveClusterVars>({ mutationKey: saveKey })
export const useDissolveCluster = () => useMutation<void, Error, string>({ mutationKey: dissolveKey })
