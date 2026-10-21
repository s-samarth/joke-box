/**
 * Voice notes on the server: the list, editing a note's details, deleting, and moving audio.
 *
 * Audio isn't JSON, so uploads and downloads use fetch directly instead of the `api` helper.
 * Recording and the offline queue live in features/voice; this file only talks to the API.
 */
import { useMutation, useQuery } from '@tanstack/react-query'
import { ApiError, api, reach } from './client'
import { keys, queryClient, refreshWhenSynced } from './queryClient'
import { QUEUED } from './sync'
import type { VoiceNote, VoiceNoteInput } from './types'

export const useVoiceNotes = () =>
  useQuery({ queryKey: keys.voiceNotes, queryFn: () => api<VoiceNote[]>('/api/voice-notes') })

export const saveVoiceDetails = (id: string, input: VoiceNoteInput) =>
  api<VoiceNote>(`/api/voice-notes/${id}`, 'PUT', input)

export const deleteVoiceNote = (id: string) => api<void>(`/api/voice-notes/${id}`, 'DELETE')

/* Renaming or deleting a note that's already on the server is queued like a joke's save, so it
 * works offline too. (A new recording goes through the outbox in features/voice instead.) */
type SaveDetailsVars = { id: string; input: VoiceNoteInput }
const saveDetailsKey = ['voice', 'save']
const deleteKey = ['voice', 'delete']

queryClient.setMutationDefaults(saveDetailsKey, {
  ...QUEUED,
  mutationFn: ({ id, input }: SaveDetailsVars) => saveVoiceDetails(id, input),
  onMutate: ({ id, input }: SaveDetailsVars) =>
    queryClient.setQueryData<VoiceNote[]>(keys.voiceNotes, (old = []) => old.map((n) => (n.id === id ? { ...n, ...input } : n))),
  onSettled: () => refreshWhenSynced(keys.voiceNotes),
})

queryClient.setMutationDefaults(deleteKey, {
  ...QUEUED,
  mutationFn: deleteVoiceNote,
  onMutate: (id: string) => queryClient.setQueryData<VoiceNote[]>(keys.voiceNotes, (old = []) => old.filter((n) => n.id !== id)),
  onSettled: () => refreshWhenSynced(keys.voiceNotes),
})

/** Change the label or hashtags of a note that's already on the server. */
export const useSaveVoiceDetails = () => useMutation<VoiceNote, Error, SaveDetailsVars>({ mutationKey: saveDetailsKey })

export const useDeleteVoiceNote = () => useMutation<void, Error, string>({ mutationKey: deleteKey })

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
  const response = await reach(`/api/voice-notes/${id}/audio`, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'X-Requested-With': 'jokebox', 'Content-Type': audio.type || 'audio/mp4' },
    body: audio,
  })
  if (!response.ok) throw await failure(response)
  return (await response.json()) as VoiceNote
}

export async function downloadVoiceAudio(id: string): Promise<Blob> {
  const response = await reach(`/api/voice-notes/${id}/audio`, { credentials: 'same-origin' })
  if (!response.ok) throw await failure(response)
  return response.blob()
}
