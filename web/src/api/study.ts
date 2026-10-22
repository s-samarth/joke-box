/**
 * The watchlist and analyses. Saves and deletes have defaults registered by key (like jokes),
 * so ticking a routine off or saving an analysis offline survives a reload and syncs later.
 * main.tsx imports this file up front, so the defaults exist before offline saves replay.
 */
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from './client'
import { keys, queryClient, refreshWhenSynced } from './queryClient'
import { QUEUED } from './sync'
import type { Analysis, AnalysisInput, WatchItem, WatchItemInput } from './types'

export type SaveWatchVars = { id: string; input: WatchItemInput }
export type SaveAnalysisVars = { id: string; input: AnalysisInput }

const saveWatchKey = ['watch', 'save']
const deleteWatchKey = ['watch', 'delete']
const saveAnalysisKey = ['analysis', 'save']
const deleteAnalysisKey = ['analysis', 'delete']

const byPosition = (a: WatchItem, b: WatchItem) => a.position - b.position || a.created_at.localeCompare(b.created_at)

queryClient.setMutationDefaults(saveWatchKey, {
  ...QUEUED,
  mutationFn: ({ id, input }: SaveWatchVars) => api<WatchItem>(`/api/watchlist/${id}`, 'PUT', input),
  onMutate: async ({ id, input }: SaveWatchVars) => {
    // Optimistic: the tick shows at once, before the server answers.
    await queryClient.cancelQueries({ queryKey: keys.watchlist })
    const now = new Date().toISOString()
    queryClient.setQueryData<WatchItem[]>(keys.watchlist, (old = []) => {
      const existing = old.find((i) => i.id === id)
      const next: WatchItem = { ...input, id, created_at: existing?.created_at ?? now, updated_at: now }
      return (existing ? old.map((i) => (i.id === id ? next : i)) : [...old, next]).sort(byPosition)
    })
  },
  onSettled: () => refreshWhenSynced(keys.watchlist),
})

queryClient.setMutationDefaults(deleteWatchKey, {
  ...QUEUED,
  mutationFn: (id: string) => api<void>(`/api/watchlist/${id}`, 'DELETE'),
  onMutate: async (id: string) => {
    await queryClient.cancelQueries({ queryKey: keys.watchlist })
    queryClient.setQueryData<WatchItem[]>(keys.watchlist, (old = []) => old.filter((i) => i.id !== id))
  },
  onSettled: () => refreshWhenSynced(keys.watchlist, keys.analyses), // its analyses lose their link
})

queryClient.setMutationDefaults(saveAnalysisKey, {
  ...QUEUED,
  mutationFn: ({ id, input }: SaveAnalysisVars) => api<Analysis>(`/api/analyses/${id}`, 'PUT', input),
  onMutate: async ({ id, input }: SaveAnalysisVars) => {
    await queryClient.cancelQueries({ queryKey: keys.analyses })
    const now = new Date().toISOString()
    queryClient.setQueryData<Analysis[]>(keys.analyses, (old = []) => {
      const existing = old.find((a) => a.id === id)
      const next: Analysis = { ...input, id, created_at: existing?.created_at ?? now, updated_at: now }
      return [next, ...old.filter((a) => a.id !== id)]
    })
  },
  onSettled: () => refreshWhenSynced(keys.analyses),
})

queryClient.setMutationDefaults(deleteAnalysisKey, {
  ...QUEUED,
  mutationFn: (id: string) => api<void>(`/api/analyses/${id}`, 'DELETE'),
  onMutate: async (id: string) => {
    await queryClient.cancelQueries({ queryKey: keys.analyses })
    queryClient.setQueryData<Analysis[]>(keys.analyses, (old = []) => old.filter((a) => a.id !== id))
  },
  onSettled: () => refreshWhenSynced(keys.analyses),
})

export const useWatchlist = () => useQuery({ queryKey: keys.watchlist, queryFn: () => api<WatchItem[]>('/api/watchlist') })
export const useSaveWatchItem = () => useMutation<WatchItem, Error, SaveWatchVars>({ mutationKey: saveWatchKey })
export const useDeleteWatchItem = () => useMutation<void, Error, string>({ mutationKey: deleteWatchKey })

export const useAnalyses = () => useQuery({ queryKey: keys.analyses, queryFn: () => api<Analysis[]>('/api/analyses') })
export const useSaveAnalysis = () => useMutation<Analysis, Error, SaveAnalysisVars>({ mutationKey: saveAnalysisKey })
export const useDeleteAnalysis = () => useMutation<void, Error, string>({ mutationKey: deleteAnalysisKey })
