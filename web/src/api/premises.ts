/**
 * Premises: queued saves like jokes, so a premise written offline syncs later, and before any
 * joke saved after it that rests on it. main.tsx imports this file up front, so the saves exist
 * before waiting ones replay.
 */
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from './client'
import { ownVersions, sendChecked } from './ownVersions'
import { keys, queryClient, refreshWhenSynced } from './queryClient'
import { QUEUED } from './sync'
import type { Joke } from './types'

/** The idea under a group of jokes: your take, and the reasoning behind it. */
export interface PremiseInput {
  topic_id: string
  take: string
  notes: string
  /** The version this edit started from, sent as the base of the save. Missing: a new one. */
  version?: number
}

export interface Premise extends PremiseInput {
  id: string
  /** Up by one per save on the server; catches edits made on two devices. */
  version: number
  created_at: string
  updated_at: string
}

/** `keepMine`: a clash being retried from Couldn't sync, to go over the other device's version. */
export type SavePremiseVars = { id: string; input: PremiseInput; keepMine?: boolean }

const saveKey = ['premise', 'save']
const deleteKey = ['premise', 'delete']

/** Edits on two devices are checked as for jokes (see ownVersions.ts). */
const ownPremises = ownVersions('premise-own-versions')

queryClient.setMutationDefaults(saveKey, {
  ...QUEUED,
  mutationFn: ({ id, input, keepMine }: SavePremiseVars) => sendChecked<Premise>(ownPremises, `/api/premises/${id}`, id, input, keepMine),
  onMutate: async ({ id, input }: SavePremiseVars) => {
    await queryClient.cancelQueries({ queryKey: keys.premises })
    const now = new Date().toISOString()
    queryClient.setQueryData<Premise[]>(keys.premises, (old = []) => {
      const existing = old.find((p) => p.id === id)
      const next: Premise = { ...input, id, version: input.version ?? existing?.version ?? 0, created_at: existing?.created_at ?? now, updated_at: now }
      return existing ? old.map((p) => (p.id === id ? next : p)) : [...old, next]
    })
  },
  onSettled: () => refreshWhenSynced(keys.premises),
})

queryClient.setMutationDefaults(deleteKey, {
  ...QUEUED,
  mutationFn: (id: string) => api<void>(`/api/premises/${id}`, 'DELETE'),
  onMutate: async (id: string) => {
    await Promise.all([keys.premises, keys.jokes].map((queryKey) => queryClient.cancelQueries({ queryKey })))
    queryClient.setQueryData<Premise[]>(keys.premises, (old = []) => old.filter((p) => p.id !== id))
    // Its jokes stay, resting on nothing.
    queryClient.setQueryData<Joke[]>(keys.jokes, (old = []) => old.map((j) => (j.premise_id === id ? { ...j, premise_id: null } : j)))
  },
  onSettled: () => refreshWhenSynced(keys.premises, keys.jokes),
})

export const usePremises = () => useQuery({ queryKey: keys.premises, queryFn: () => api<Premise[]>('/api/premises') })
export const useSavePremise = () => useMutation<Premise, Error, SavePremiseVars>({ mutationKey: saveKey })
export const useDeletePremise = () => useMutation<void, Error, string>({ mutationKey: deleteKey })
