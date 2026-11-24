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
  /** Notes: anything else about it, in a box of its own. Left out of a save, it stays as stored. */
  extra_notes?: string
  /** 1 (Weak) to 5 (Killer), or null: not rated yet. Left out of a save, it stays as stored. */
  strength?: number | null
  /** Where it stands, apart from its jokes' statuses. Left out of a save, it stays as stored. */
  status?: PremiseStatus
  /** The version this edit started from, sent as the base of the save. Missing: a new one. */
  version?: number
}

/** A premise's own status: new ones are Drafts. Discarded ones hide from the list until asked for. */
export const PREMISE_STATUSES = ['Draft', 'Work in Progress', 'Stage Ready', 'Discarded'] as const
export type PremiseStatus = (typeof PREMISE_STATUSES)[number]

/** Work in Progress was called Testing until November 2026: a copy cached before then, or an old
 *  filter in the address, reads as the new name. The server does the same for a queued save. */
export const premiseStatus = (status: string | null | undefined): PremiseStatus =>
  status?.trim().toLowerCase() === 'testing' ? 'Work in Progress' : ((status as PremiseStatus | undefined) ?? 'Draft')
const current = (list: Premise[]): Premise[] => (list.some((p) => (p.status as string) === 'Testing') ? list.map((p) => ({ ...p, status: premiseStatus(p.status) })) : list)

export interface Premise extends PremiseInput {
  id: string
  strength: number | null
  status: PremiseStatus
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
      // A save that leaves a field out keeps what's there (or the server's default, for a new one).
      const next: Premise = { extra_notes: '', strength: null, status: 'Draft', ...existing, ...input, id, version: input.version ?? existing?.version ?? 0, created_at: existing?.created_at ?? now, updated_at: now }
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

export const usePremises = () => useQuery({ queryKey: keys.premises, queryFn: () => api<Premise[]>('/api/premises'), select: current })
export const useSavePremise = () => useMutation<Premise, Error, SavePremiseVars>({ mutationKey: saveKey })
export const useDeletePremise = () => useMutation<void, Error, string>({ mutationKey: deleteKey })
