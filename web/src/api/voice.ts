/**
 * Voice notes on the server: the list, editing a note's details, deleting, and moving audio.
 *
 * Audio isn't JSON, so uploads and downloads use fetch directly instead of the `api` helper.
 * Recording and the offline queue live in features/voice; this file only talks to the API.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from './client'
import { keys } from './queryClient'
import type { VoiceNote, VoiceNoteInput } from './types'

export const useVoiceNotes = () =>
  useQuery({ queryKey: keys.voiceNotes, queryFn: () => api<VoiceNote[]>('/api/voice-notes') })

export const saveVoiceDetails = (id: string, input: VoiceNoteInput) =>
  api<VoiceNote>(`/api/voice-notes/${id}`, 'PUT', input)

/** Change the label or hashtags of a note that's already on the server. */
export function useSaveVoiceDetails() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VoiceNoteInput }) => saveVoiceDetails(id, input),
    onMutate: ({ id, input }) =>
      qc.setQueryData<VoiceNote[]>(keys.voiceNotes, (old = []) => old.map((n) => (n.id === id ? { ...n, ...input } : n))),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.voiceNotes }),
  })
}

export function useDeleteVoiceNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/api/voice-notes/${id}`, 'DELETE'),
    onMutate: (id) => qc.setQueryData<VoiceNote[]>(keys.voiceNotes, (old = []) => old.filter((n) => n.id !== id)),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.voiceNotes }),
  })
}

async function failure(response: Response): Promise<ApiError> {
  let message = `Upload failed (${response.status})`
  try {
    const data = (await response.json()) as { detail?: unknown }
    if (typeof data.detail === 'string') message = data.detail
  } catch {
    // not JSON
  }
  return new ApiError(response.status, message)
}

/** Send the recording itself as the request body. */
export async function uploadVoiceAudio(id: string, audio: Blob): Promise<VoiceNote> {
  const response = await fetch(`/api/voice-notes/${id}/audio`, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'jokebox', 'Content-Type': audio.type || 'audio/mp4' },
    body: audio,
  })
  if (!response.ok) throw await failure(response)
  return (await response.json()) as VoiceNote
}

export async function downloadVoiceAudio(id: string): Promise<Blob> {
  const response = await fetch(`/api/voice-notes/${id}/audio`, { credentials: 'same-origin' })
  if (!response.ok) throw await failure(response)
  return response.blob()
}
