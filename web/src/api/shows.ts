/** Hooks for brainstorms, setlists, venues and performance logs. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import { keys } from './queryClient'
import {
  type SaveBrainstormVars, type SaveLogVars, type SaveSetlistVars, deleteBrainstormKey, deleteBrainstormVersionKey,
  deleteLogKey, deleteSetlistKey, saveBrainstormKey, saveLogKey, saveSetlistKey,
} from './showSaves'
import type { Brainstorm, PerformanceLog, Setlist, Venue } from './types'

export const useBrainstorms = () =>
  useQuery({ queryKey: keys.brainstorms, queryFn: () => api<Brainstorm[]>('/api/brainstorms') })

export const useSetlists = () =>
  useQuery({ queryKey: keys.setlists, queryFn: () => api<Setlist[]>('/api/setlists') })

export const useVenues = () =>
  useQuery({ queryKey: keys.venues, queryFn: () => api<Venue[]>('/api/venues') })

/**
 * Delete a venue, first moving its shows and sets to `moveTo` if it has any. Online only, like
 * deleting a Craft area: the server does the move, then every list that shows venues refreshes.
 */
export function useDeleteVenue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, moveTo }: { id: string; moveTo?: string }) =>
      api<void>(`/api/venues/${id}${moveTo ? `?move_to=${moveTo}` : ''}`, 'DELETE'),
    onSettled: () => Promise.all([keys.venues, keys.logs, keys.setlists].map((queryKey) => qc.invalidateQueries({ queryKey }))),
  })
}

export const useLogs = () =>
  useQuery({ queryKey: keys.logs, queryFn: () => api<PerformanceLog[]>('/api/logs') })

export interface BrainstormInput {
  bit_id: string
  title: string
  content: string
  timer_seconds: number
}

/** Saves and deletes below are queued (see showSaves.ts): offline they wait and sync later. */
export function useBrainstormActions() {
  const save = useMutation<Brainstorm, Error, SaveBrainstormVars>({ mutationKey: saveBrainstormKey })
  const remove = useMutation<void, Error, string>({ mutationKey: deleteBrainstormKey })
  const removeVersion = useMutation<void, Error, string>({ mutationKey: deleteBrainstormVersionKey })
  return { save, remove, removeVersion }
}

export interface SetlistInput {
  name: string
  show_date: string | null
  target_seconds: number
  venue_name: string | null
  rating: number | null
  tag_ids: string[]
  items: { bit_id: string; duration_seconds: number; optional: boolean }[]
}

export function useSetlistActions() {
  const save = useMutation<Setlist, Error, SaveSetlistVars>({ mutationKey: saveSetlistKey })
  const remove = useMutation<void, Error, string>({ mutationKey: deleteSetlistKey })
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
  const save = useMutation<PerformanceLog, Error, SaveLogVars>({ mutationKey: saveLogKey })
  const remove = useMutation<void, Error, string>({ mutationKey: deleteLogKey })
  return { save, remove }
}
