/**
 * TanStack Query setup: the cache that holds all server data in the browser.
 *
 * Pattern: "server state" (bits, topics...) lives here, not in useState. Screens read it with
 * useQuery and change it with useMutation; after a change we invalidate the affected keys and
 * TanStack refetches them. The cache is saved to IndexedDB, so the app opens offline.
 */
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { del, get, set } from 'idb-keyval'
import { ApiError, api } from './client'
import type { Bit, BitInput } from './types'

const WEEK = 1000 * 60 * 60 * 24 * 7

export const keys = {
  me: ['me'],
  topics: ['topics'],
  types: ['types'],
  statuses: ['statuses'],
  bits: ['bits'],
  brainstorms: ['brainstorms'],
  setlists: ['setlists'],
  venues: ['venues'],
  logs: ['logs'],
} as const

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: WEEK, // keep data long enough to be saved for offline use
      staleTime: 30_000,
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
  },
})

export const persister = createAsyncStoragePersister({
  storage: { getItem: get, setItem: set, removeItem: del },
  key: 'jokebox-cache',
})

export const persistMaxAge = WEEK

/* ---- Offline-capable bit saves and deletes ----
 * These have defaults registered by key, so a save made offline survives a reload:
 * it is stored as a "paused mutation" and re-run with this function once back online.
 */
export type SaveBitVars = { id: string; input: BitInput }

export const saveBitKey = ['bit', 'save']
export const deleteBitKey = ['bit', 'delete']

queryClient.setMutationDefaults(saveBitKey, {
  mutationFn: ({ id, input }: SaveBitVars) => api<Bit>(`/api/bits/${id}`, 'PUT', input),
  onMutate: async ({ id, input }: SaveBitVars) => {
    // Optimistic update: show the change immediately, before the server answers.
    await queryClient.cancelQueries({ queryKey: keys.bits })
    const now = new Date().toISOString()
    queryClient.setQueryData<Bit[]>(keys.bits, (old = []) => {
      const existing = old.find((b) => b.id === id)
      const next: Bit = { ...input, id, created_at: existing?.created_at ?? now, updated_at: now }
      return existing ? old.map((b) => (b.id === id ? next : b)) : [next, ...old]
    })
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: keys.bits })
    void queryClient.invalidateQueries({ queryKey: keys.types })
    void queryClient.invalidateQueries({ queryKey: keys.statuses })
  },
})

queryClient.setMutationDefaults(deleteBitKey, {
  mutationFn: (id: string) => api<void>(`/api/bits/${id}`, 'DELETE'),
  onMutate: async (id: string) => {
    await queryClient.cancelQueries({ queryKey: keys.bits })
    queryClient.setQueryData<Bit[]>(keys.bits, (old = []) => old.filter((b) => b.id !== id))
  },
  onSettled: () => {
    for (const key of [keys.bits, keys.types, keys.brainstorms, keys.setlists]) {
      void queryClient.invalidateQueries({ queryKey: key })
    }
  },
})
