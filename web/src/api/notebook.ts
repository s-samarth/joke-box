/**
 * Hooks for observations and their kinds. An observation's topic comes from the joke topics
 * (useTopics); its kind ("Set ideas", "Questions") is its own, served at /api/observation-topics.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import './observationSaves'
import { deleteObservationKey, keys, saveObservationKey, type SaveObservationVars } from './queryClient'
import type { Named, Observation } from './types'

export const useObservations = () =>
  useQuery({ queryKey: keys.observations, queryFn: () => api<Observation[]>('/api/observations') })

export const useObservationKinds = () =>
  useQuery({ queryKey: keys.observationKinds, queryFn: () => api<Named[]>('/api/observation-topics') })

export const useSaveObservation = () => useMutation<Observation, Error, SaveObservationVars>({ mutationKey: saveObservationKey })

export const useDeleteObservation = () => useMutation<void, Error, string>({ mutationKey: deleteObservationKey })

export function useObservationKindActions() {
  const qc = useQueryClient()
  const onSuccess = () => {
    void qc.invalidateQueries({ queryKey: keys.observationKinds })
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
