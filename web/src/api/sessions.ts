/** Hooks for free brainstorm sessions (typed text, handwriting, timer and links). */
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from './client'
import { deleteSessionKey, keys, saveSessionKey, type SaveSessionVars } from './queryClient'
import type { WritingSession } from './types'

export const useSessions = () =>
  useQuery({ queryKey: keys.sessions, queryFn: () => api<WritingSession[]>('/api/sessions') })

export const useSaveSession = () => useMutation<WritingSession, Error, SaveSessionVars>({ mutationKey: saveSessionKey })

export const useDeleteSession = () => useMutation<void, Error, string>({ mutationKey: deleteSessionKey })
