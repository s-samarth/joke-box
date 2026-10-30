/**
 * Premises: queued saves like jokes, so a premise written offline syncs later, and before any
 * joke saved after it that rests on it. main.tsx imports this file up front, so the saves exist
 * before waiting ones replay.
 */
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from './client'
import { keys, queryClient, refreshWhenSynced } from './queryClient'
import { QUEUED } from './sync'
import type { Joke } from './types'

/** The idea under a group of jokes: your take, and the reasoning behind it. */
export interface PremiseInput {
  topic_id: string
  take: string
  notes: string
}

export interface Premise extends PremiseInput {
  id: string
  created_at: string
  updated_at: string
}

export type SavePremiseVars = { id: string; input: PremiseInput }

const saveKey = ['premise', 'save']
const deleteKey = ['premise', 'delete']

queryClient.setMutationDefaults(saveKey, {
  ...QUEUED,
  mutationFn: ({ id, input }: SavePremiseVars) => api<Premise>(`/api/premises/${id}`, 'PUT', input),
  onMutate: async ({ id, input }: SavePremiseVars) => {
    await queryClient.cancelQueries({ queryKey: keys.premises })
    const now = new Date().toISOString()
    queryClient.setQueryData<Premise[]>(keys.premises, (old = []) => {
      const existing = old.find((p) => p.id === id)
      const next: Premise = { ...input, id, created_at: existing?.created_at ?? now, updated_at: now }
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
