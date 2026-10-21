/** Hooks for brainstorms, setlists, venues and performance logs. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { keys } from './queryClient'
import type { Brainstorm, Named, PerformanceLog, Setlist } from './types'

export const useBrainstorms = () =>
  useQuery({ queryKey: keys.brainstorms, queryFn: () => api<Brainstorm[]>('/api/brainstorms') })

export const useSetlists = () =>
  useQuery({ queryKey: keys.setlists, queryFn: () => api<Setlist[]>('/api/setlists') })

export const useVenues = () =>
  useQuery({ queryKey: keys.venues, queryFn: () => api<Named[]>('/api/venues') })

export const useLogs = () =>
  useQuery({ queryKey: keys.logs, queryFn: () => api<PerformanceLog[]>('/api/logs') })

export interface BrainstormInput {
  bit_id: string
  title: string
  content: string
  timer_seconds: number
}

export function useBrainstormActions() {
  const qc = useQueryClient()
  const onSuccess = () => qc.invalidateQueries({ queryKey: keys.brainstorms })
  const save = useMutation({
    mutationFn: ({ id, input }: { id: string; input: BrainstormInput }) =>
      api<Brainstorm>(`/api/brainstorms/${id}`, 'PUT', input),
    onSuccess,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api<void>(`/api/brainstorms/${id}`, 'DELETE'),
    onSuccess,
  })
  const removeVersion = useMutation({
    mutationFn: (id: string) => api<void>(`/api/brainstorm-versions/${id}`, 'DELETE'),
    onSuccess,
  })
  return { save, remove, removeVersion }
}

export interface SetlistInput {
  name: string
  show_date: string | null
  target_seconds: number
  venue_name: string | null
  items: { bit_id: string; duration_seconds: number }[]
}

export function useSetlistActions() {
  const qc = useQueryClient()
  const onSuccess = () => {
    void qc.invalidateQueries({ queryKey: keys.setlists })
    void qc.invalidateQueries({ queryKey: keys.venues })
  }
  const save = useMutation({
    mutationFn: ({ id, input }: { id: string; input: SetlistInput }) =>
      api<Setlist>(`/api/setlists/${id}`, 'PUT', input),
    onSuccess,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api<void>(`/api/setlists/${id}`, 'DELETE'),
    onSuccess,
  })
  return { save, remove }
}

export interface LogInput {
  venue_name: string
  performed_at: string
  duration_seconds: number
  audience_size: number
  rating: number
  topic_ids: string[]
  notes: string
  laughs: number[] | null
}

export function useLogActions() {
  const qc = useQueryClient()
  const onSuccess = () => {
    void qc.invalidateQueries({ queryKey: keys.logs })
    void qc.invalidateQueries({ queryKey: keys.venues })
  }
  const save = useMutation({
    mutationFn: ({ id, input }: { id: string; input: LogInput }) =>
      api<PerformanceLog>(`/api/logs/${id}`, 'PUT', input),
    onSuccess,
  })
  const remove = useMutation({
    mutationFn: (id: string) => api<void>(`/api/logs/${id}`, 'DELETE'),
    onSuccess,
  })
  const addVenue = useMutation({
    mutationFn: (name: string) => api<Named>('/api/venues', 'POST', { name }),
    onSuccess,
  })
  return { save, remove, addVenue }
}
