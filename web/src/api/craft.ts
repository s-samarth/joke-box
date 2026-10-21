/**
 * Craft notes. Saves and deletes have defaults registered by key (like analyses), so a note
 * written offline survives a reload and syncs later. main.tsx imports this file up front.
 */
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from './client'
import { keys, queryClient } from './queryClient'
import type { CraftArea, CraftAreaInput, CraftNote, CraftNoteInput, NoteKind, NoteKindInput } from './types'

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
      // The behaviour comes from the kind, so look it up for the optimistic copy.
      const kind = queryClient.getQueryData<NoteKind[]>(keys.craftKinds)?.find((k) => k.id === input.kind_id)
      const behaviour = kind?.behaviour ?? existing?.behaviour ?? 'reference'
      const next: CraftNote = { ...input, id, behaviour, created_at: existing?.created_at ?? now, updated_at: now }
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
  title: n.title, body: n.body, kind_id: n.kind_id, area_id: n.area_id, hashtags: n.hashtags, source: n.source, url: n.url, position: n.position,
  performance_log_id: n.performance_log_id, analysis_id: n.analysis_id,
})

/* Areas change online only: renaming or deleting one touches many notes, so it should land now. */
const refreshAreas = () => {
  void queryClient.invalidateQueries({ queryKey: keys.craftAreas })
  void queryClient.invalidateQueries({ queryKey: keys.craftNotes })
}

export const useCraftAreas = () => useQuery({ queryKey: keys.craftAreas, queryFn: () => api<CraftArea[]>('/api/craft-areas') })

export const useCreateArea = () =>
  useMutation({ mutationFn: (input: CraftAreaInput) => api<CraftArea>('/api/craft-areas', 'POST', input), onSettled: refreshAreas })

export const useUpdateArea = () =>
  useMutation({ mutationFn: ({ id, input }: { id: string; input: CraftAreaInput }) => api<CraftArea>(`/api/craft-areas/${id}`, 'PATCH', input), onSettled: refreshAreas })

export const useReorderAreas = () =>
  useMutation({
    mutationFn: (ids: string[]) => api<void>('/api/craft-areas/order', 'PUT', { ids }),
    onMutate: (ids: string[]) => queryClient.setQueryData<CraftArea[]>(keys.craftAreas, (old = []) =>
      ids.map((id) => old.find((a) => a.id === id)).filter((a): a is CraftArea => Boolean(a)).map((a, position) => ({ ...a, position }))),
    onSettled: refreshAreas,
  })

export const useDeleteArea = () =>
  useMutation({ mutationFn: ({ id, moveTo }: { id: string; moveTo: string }) => api<void>(`/api/craft-areas/${id}?move_to=${moveTo}`, 'DELETE'), onSettled: refreshAreas })

export const areaInput = (a: CraftArea): CraftAreaInput => ({ name: a.name, description: a.description, color: a.color, screens: a.screens })

/* Kinds change online only too: deleting one moves its notes. */
const refreshKinds = () => {
  void queryClient.invalidateQueries({ queryKey: keys.craftKinds })
  void queryClient.invalidateQueries({ queryKey: keys.craftNotes })
}

export const useCraftKinds = () => useQuery({ queryKey: keys.craftKinds, queryFn: () => api<NoteKind[]>('/api/craft-kinds') })

export const useCreateKind = () =>
  useMutation({ mutationFn: (input: NoteKindInput) => api<NoteKind>('/api/craft-kinds', 'POST', input), onSettled: refreshKinds })

export const useUpdateKind = () =>
  useMutation({ mutationFn: ({ id, input }: { id: string; input: NoteKindInput }) => api<NoteKind>(`/api/craft-kinds/${id}`, 'PATCH', input), onSettled: refreshKinds })

export const useDeleteKind = () =>
  useMutation({ mutationFn: ({ id, moveTo }: { id: string; moveTo: string }) => api<void>(`/api/craft-kinds/${id}?move_to=${moveTo}`, 'DELETE'), onSettled: refreshKinds })
