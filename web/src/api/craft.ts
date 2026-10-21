/**
 * Craft notes. Saves and deletes have defaults registered by key (like analyses), so a note
 * written offline survives a reload and syncs later. main.tsx imports this file up front.
 */
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from './client'
import { keys, queryClient } from './queryClient'
import type { CraftNote, CraftNoteInput } from './types'

export type SaveCraftVars = { id: string; input: CraftNoteInput }

const saveKey = ['craft', 'save']
const deleteKey = ['craft', 'delete']

const byPosition = (a: CraftNote, b: CraftNote) => a.position - b.position || a.created_at.localeCompare(b.created_at)

queryClient.setMutationDefaults(saveKey, {
  mutationFn: ({ id, input }: SaveCraftVars) => api<CraftNote>(`/api/craft-notes/${id}`, 'PUT', input),
  onMutate: async ({ id, input }: SaveCraftVars) => {
    await queryClient.cancelQueries({ queryKey: keys.craftNotes })
    const now = new Date().toISOString()
    queryClient.setQueryData<CraftNote[]>(keys.craftNotes, (old = []) => {
      const existing = old.find((n) => n.id === id)
      const next: CraftNote = { ...input, id, created_at: existing?.created_at ?? now, updated_at: now }
      return (existing ? old.map((n) => (n.id === id ? next : n)) : [...old, next]).sort(byPosition)
    })
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: keys.craftNotes }),
})

queryClient.setMutationDefaults(deleteKey, {
  mutationFn: (id: string) => api<void>(`/api/craft-notes/${id}`, 'DELETE'),
  onMutate: async (id: string) => {
    await queryClient.cancelQueries({ queryKey: keys.craftNotes })
    queryClient.setQueryData<CraftNote[]>(keys.craftNotes, (old = []) => old.filter((n) => n.id !== id))
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: keys.craftNotes }),
})

export const useCraftNotes = () => useQuery({ queryKey: keys.craftNotes, queryFn: () => api<CraftNote[]>('/api/craft-notes') })
export const useSaveCraftNote = () => useMutation<CraftNote, Error, SaveCraftVars>({ mutationKey: saveKey })
export const useDeleteCraftNote = () => useMutation<void, Error, string>({ mutationKey: deleteKey })

/** The editable part of a saved note, for saving it again with one change. */
export const craftInput = (n: CraftNote): CraftNoteInput => ({
  title: n.title, body: n.body, kind: n.kind, area: n.area, hashtags: n.hashtags, source: n.source, url: n.url, position: n.position,
  performance_log_id: n.performance_log_id, analysis_id: n.analysis_id,
})
