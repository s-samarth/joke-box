/**
 * The Trash: what you deleted, kept 30 days. Putting something back, deleting it now and
 * emptying the Trash are queued like every other save, so they work offline and sync later.
 * main.tsx imports this file up front, so the defaults exist before waiting saves replay.
 */
import { useMutation, useQuery } from '@tanstack/react-query'
import type { QueryKey } from '@tanstack/react-query'
import { api } from './client'
import { keys, queryClient, refreshWhenSynced } from './queryClient'
import { QUEUED } from './sync'

export type TrashKind = 'jokes' | 'rewrites' | 'observations' | 'brainstorms' | 'voice-notes' | 'shows' | 'analyses' | 'watchlist' | 'craft-notes'

export interface TrashItem {
  kind: TrashKind
  id: string
  title: string
  detail: string
  /** A show's date. */
  when: string | null
  deleted_at: string
  erase_at: string
}

export type TrashVars = { kind: TrashKind; id: string }

/** Each kind's name in the Trash, and the lists that change when one comes back. */
export const TRASH_KINDS: Record<TrashKind, { label: string; lists: QueryKey[] }> = {
  jokes: { label: 'Jokes', lists: [keys.jokes, keys.brainstorms, keys.setlists, keys.types] },
  rewrites: { label: 'Rewrites', lists: [keys.brainstorms] },
  observations: { label: 'Observations', lists: [keys.observations] },
  brainstorms: { label: 'Brainstorms', lists: [keys.sessions] },
  'voice-notes': { label: 'Voice notes', lists: [keys.voiceNotes] },
  shows: { label: 'Shows', lists: [keys.logs, keys.venues] },
  analyses: { label: 'Analyses', lists: [keys.analyses] },
  watchlist: { label: 'Watchlist', lists: [keys.watchlist] },
  'craft-notes': { label: 'Craft notes', lists: [keys.craftNotes] },
}

const restoreKey = ['trash', 'restore']
const eraseKey = ['trash', 'erase']
const emptyKey = ['trash', 'empty']

/** Take it off the Trash list at once, before the server answers. */
async function drop(id?: string) {
  await queryClient.cancelQueries({ queryKey: keys.trash })
  queryClient.setQueryData<TrashItem[]>(keys.trash, (old = []) => (id ? old.filter((i) => i.id !== id) : []))
}

queryClient.setMutationDefaults(restoreKey, {
  ...QUEUED,
  mutationFn: ({ kind, id }: TrashVars) => api<void>(`/api/trash/${kind}/${id}/restore`, 'POST'),
  onMutate: ({ id }: TrashVars) => drop(id),
  onSettled: (_data: unknown, _error: unknown, { kind }: TrashVars) => refreshWhenSynced(keys.trash, ...TRASH_KINDS[kind].lists),
})

queryClient.setMutationDefaults(eraseKey, {
  ...QUEUED,
  mutationFn: ({ kind, id }: TrashVars) => api<void>(`/api/trash/${kind}/${id}`, 'DELETE'),
  onMutate: ({ id }: TrashVars) => drop(id),
  onSettled: () => refreshWhenSynced(keys.trash),
})

queryClient.setMutationDefaults(emptyKey, {
  ...QUEUED,
  mutationFn: () => api<void>('/api/trash', 'DELETE'),
  onMutate: () => drop(),
  onSettled: () => refreshWhenSynced(keys.trash),
})

/** Always fetched fresh when opened: things land here from every other screen. */
export const useTrash = () =>
  useQuery({ queryKey: keys.trash, queryFn: () => api<TrashItem[]>('/api/trash'), refetchOnMount: 'always' })

export const useRestore = () => useMutation<void, Error, TrashVars>({ mutationKey: restoreKey })
export const useErase = () => useMutation<void, Error, TrashVars>({ mutationKey: eraseKey })
export const useEmptyTrash = () => useMutation<void, Error, void>({ mutationKey: emptyKey })
