/** Hooks for observations and their own topics (kept apart from joke topics). */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { deleteObservationKey, keys, saveObservationKey, type SaveObservationVars } from './queryClient'
import type { Named, Observation } from './types'

export const useObservations = () =>
  useQuery({ queryKey: keys.observations, queryFn: () => api<Observation[]>('/api/observations') })

export const useObservationTopics = () =>
  useQuery({ queryKey: keys.observationTopics, queryFn: () => api<Named[]>('/api/observation-topics') })

export const useSaveObservation = () => useMutation<Observation, Error, SaveObservationVars>({ mutationKey: saveObservationKey })

export const useDeleteObservation = () => useMutation<void, Error, string>({ mutationKey: deleteObservationKey })

export function useObservationTopicActions() {
  const qc = useQueryClient()
  const onSuccess = () => {
    void qc.invalidateQueries({ queryKey: keys.observationTopics })
    void qc.invalidateQueries({ queryKey: keys.observations })
  }
  const create = useMutation({
    mutationFn: (name: string) => api<Named>('/api/observation-topics', 'POST', { name }),
    onSuccess,
  })
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api<Named>(`/api/observation-topics/${id}`, 'PATCH', { name }),
    onSuccess,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api<void>(`/api/observation-topics/${id}`, 'DELETE'),
    onSuccess,
  })
  return { create, rename, remove }
}
