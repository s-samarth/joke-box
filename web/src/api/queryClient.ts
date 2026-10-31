/**
 * TanStack Query setup: the cache that holds all server data in the browser.
 *
 * Pattern: "server state" (jokes, topics...) lives here, not in useState. Screens read it with
 * useQuery and change it with useMutation; after a change we invalidate the affected keys and
 * TanStack refetches them. The cache is saved to IndexedDB, so the app opens offline.
 */
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { MutationCache, type QueryKey, QueryClient } from '@tanstack/react-query'
import { del, get, set } from 'idb-keyval'
import { ApiError, api } from './client'
import { QUEUED, dropOlderWaiting } from './sync'
import { keepUnsynced } from './unsynced'
import type { Observation, ObservationInput, WritingSession, WritingSessionInput } from './types'

const WEEK = 1000 * 60 * 60 * 24 * 7

export const keys = {
  me: ['me'],
  connections: ['connections'],
  topics: ['topics'],
  types: ['types'],
  typeColors: ['type-colors'],
  statuses: ['statuses'],
  jokes: ['jokes'],
  brainstorms: ['brainstorms'],
  setlists: ['setlists'],
  venues: ['venues'],
  logs: ['logs'],
  observations: ['observations'],
  observationTopics: ['observation-topics'],
  sessions: ['sessions'],
  voiceNotes: ['voice-notes'],
  watchlist: ['watchlist'],
  analyses: ['analyses'],
  craftNotes: ['craft-notes'],
  craftAreas: ['craft-areas'],
  craftKinds: ['craft-kinds'],
  trash: ['trash'],
  setTags: ['set-tags'],
  board: ['board'],
  premises: ['premises'],
} as const

export const queryClient = new QueryClient({
  // A queued save that fails for good (refused, or gave up) goes to the "Couldn't sync" list
  // with what you wrote, instead of vanishing.
  mutationCache: new MutationCache({
    onError: (error, variables, _result, mutation) => {
      const key = mutation.options.mutationKey
      if (key && mutation.options.scope?.id === QUEUED.scope.id) keepUnsynced(key, variables, error)
    },
  }),
  defaultOptions: {
    queries: {
      gcTime: WEEK, // keep data long enough to be saved for offline use
      staleTime: 30_000,
      retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    },
    // Anything not queued (renaming a topic, deleting a venue...) needs the server there and then:
    // offline it fails at once with "You're offline" rather than spinning. Queued saves override this.
    mutations: { networkMode: 'always', retry: false },
  },
})

/* Lists to refetch once the queue is empty. Refetching while saves are still waiting would show
 * the server's older copy for a moment, so the change you just made would seem to vanish. */
const toRefresh = new Map<string, QueryKey>()
const queued = () => queryClient.isMutating({ predicate: (m) => m.options.scope?.id === QUEUED.scope.id })

/** Called as each queued save settles; the last one (it still counts itself) refetches. */
export async function refreshWhenSynced(...lists: QueryKey[]) {
  lists.forEach((k) => toRefresh.set(JSON.stringify(k), k))
  if (queued() > 1) return
  const all = [...toRefresh.values()]
  toRefresh.clear()
  await Promise.all(all.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

/**
 * Restart every save restored from the phone, including any that were mid-flight when the app
 * closed: those may or may not have reached the server, and sending a save twice is harmless.
 */
export const resumeQueued = () =>
  Promise.all(queryClient.getMutationCache().getAll().filter((m) => m.state.status === 'pending').map((m) => m.continue().catch(() => {})))

/** Where the saved copy lives in IndexedDB. Never rename it: waiting saves are stored under it. */
export const CACHE_KEY = 'jokebox-cache'

export const persister = createAsyncStoragePersister({
  storage: { getItem: get, setItem: set, removeItem: del },
  key: CACHE_KEY,
  throttleTime: 300, // a save is on the phone within a moment, even if the app is closed straight away
})

/*
 * The saved copy never expires as a whole: saves waiting in it must survive however long the app
 * goes unopened. Old data in it is harmless (it refreshes once online) and each list is still
 * dropped a week after it was last used (gcTime).
 */
export const persistMaxAge = Infinity

/*
 * Changing this throws away the whole saved copy on every phone, including saves still waiting
 * to sync. Don't, unless the cache format truly changes; and then drain the queue first.
 * Likewise the mutation keys below are stored with each waiting save, so never rename one.
 * queuedKeys.test.ts holds both in place.
 */
export const CACHE_BUSTER = 'v1'

/* Observations get the same offline treatment: jot one down on the bus, it syncs later. */
export type SaveObservationVars = { id: string; input: ObservationInput }

export const saveObservationKey = ['observation', 'save']
export const deleteObservationKey = ['observation', 'delete']

queryClient.setMutationDefaults(saveObservationKey, {
  ...QUEUED,
  mutationFn: ({ id, input }: SaveObservationVars) => api<Observation>(`/api/observations/${id}`, 'PUT', input),
  onMutate: async ({ id, input }: SaveObservationVars) => {
    await queryClient.cancelQueries({ queryKey: keys.observations })
    const now = new Date().toISOString()
    queryClient.setQueryData<Observation[]>(keys.observations, (old = []) => {
      const existing = old.find((o) => o.id === id)
      const next: Observation = { ...input, id, created_at: existing?.created_at ?? now, updated_at: now }
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

/* Brainstorm sessions autosave the same way, so a session written offline syncs later. */
export type SaveSessionVars = { id: string; input: WritingSessionInput }

export const saveSessionKey = ['session', 'save']
export const deleteSessionKey = ['session', 'delete']

queryClient.setMutationDefaults(saveSessionKey, {
  ...QUEUED,
  mutationFn: ({ id, input }: SaveSessionVars) => api<WritingSession>(`/api/sessions/${id}`, 'PUT', input),
  onMutate: async ({ id, input }: SaveSessionVars) => {
    dropOlderWaiting(queryClient, saveSessionKey, id) // this save has it all: older waiting copies go
    await queryClient.cancelQueries({ queryKey: keys.sessions })
    const now = new Date().toISOString()
    queryClient.setQueryData<WritingSession[]>(keys.sessions, (old = []) => {
      const existing = old.find((s) => s.id === id)
      const next: WritingSession = { ...input, id, created_at: existing?.created_at ?? now, updated_at: now }
      return [next, ...old.filter((s) => s.id !== id)]
    })
  },
  onSettled: () => refreshWhenSynced(keys.sessions),
})

queryClient.setMutationDefaults(deleteSessionKey, {
  ...QUEUED,
  mutationFn: (id: string) => api<void>(`/api/sessions/${id}`, 'DELETE'),
  onMutate: async (id: string) => {
    await queryClient.cancelQueries({ queryKey: keys.sessions })
    queryClient.setQueryData<WritingSession[]>(keys.sessions, (old = []) => old.filter((s) => s.id !== id))
  },
  onSettled: () => refreshWhenSynced(keys.sessions),
})
