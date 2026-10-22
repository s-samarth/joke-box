/**
 * Set tags: your own labels for sets (In progress, Weak, Opener set...). Adding, renaming and
 * deleting one needs a connection, like topics; tagging a set is part of the set's own save.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { keys } from './queryClient'
import type { Named } from './types'

export const useSetTags = () => useQuery({ queryKey: keys.setTags, queryFn: () => api<Named[]>('/api/set-tags') })

export function useSetTagActions() {
  const qc = useQueryClient()
  const tags = () => qc.invalidateQueries({ queryKey: keys.setTags })
  const create = useMutation({ mutationFn: (name: string) => api<Named>('/api/set-tags', 'POST', { name }), onSuccess: tags })
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api<Named>(`/api/set-tags/${id}`, 'PATCH', { name }),
    onSuccess: tags,
  })
  // Deleting a tag takes it off every set, so the sets refresh too.
  const remove = useMutation({
    mutationFn: (id: string) => api<void>(`/api/set-tags/${id}`, 'DELETE'),
    onSuccess: () => Promise.all([tags(), qc.invalidateQueries({ queryKey: keys.setlists })]),
  })
  return { create, rename, remove }
}
