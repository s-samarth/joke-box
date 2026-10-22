/**
 * One list of voice notes for the screens: the ones still in the outbox on this phone, then the
 * ones on the server. Editing and deleting go to whichever place currently holds the note.
 */
import type { VoiceNoteInput } from '../../api/types'
import { useDeleteVoiceNote, useSaveVoiceDetails, useVoiceNotes } from '../../api/voice'
import { forgetAudio } from './audioCache'
import { discardPending, editPending, useOutbox } from './outbox'
import { useErase } from '../../api/trash'

export type NoteState = 'saved' | 'uploading' | 'waiting' | 'failed'

export interface NoteView extends VoiceNoteInput {
  id: string
  created_at: string
  size_bytes: number
  state: NoteState
  problem?: string
  /** Its recording is only on this phone so far. */
  local?: boolean
}

export function useVoiceLibrary() {
  const { data: server = [], isPending } = useVoiceNotes()
  const { items, uploading } = useOutbox()
  const saveDetails = useSaveVoiceDetails()
  const removeOnServer = useDeleteVoiceNote()
  const erase = useErase()
  const pending = new Map(items.map((p) => [p.id, p]))

  const notes: NoteView[] = [
    ...items.map((p) => ({
      ...p.input, id: p.id, created_at: p.created_at, size_bytes: p.bytes.byteLength, problem: p.failed, local: true,
      state: (p.failed ? 'failed' : uploading === p.id ? 'uploading' : 'waiting') as NoteState,
    })),
    ...server.filter((n) => !pending.has(n.id)).map((n) => ({
      label: n.label, hashtags: n.hashtags, duration_seconds: n.duration_seconds, id: n.id,
      created_at: n.created_at, size_bytes: n.size_bytes, state: (n.has_audio ? 'saved' : 'waiting') as NoteState,
    })),
  ]

  // Both check the outbox's live state, not this render's copy: a note may finish uploading
  // between the render and the tap.
  const edit = async (id: string, input: VoiceNoteInput) => {
    if (!(await editPending(id, input))) saveDetails.mutate({ id, input })
  }

  const remove = async (id: string) => {
    const waiting = await discardPending(id)
    // A note whose details already reached the server has a row there to delete too. One still
    // waiting to upload has its recording only on this phone, which goes now, so it skips the
    // Trash: putting it back would return a note with no sound.
    if (!waiting || waiting.detailsSaved) removeOnServer.mutate(id)
    if (waiting?.detailsSaved) erase.mutate({ kind: 'voice-notes', id })
    await forgetAudio(id)
  }

  const usedBytes = notes.reduce((sum, n) => sum + n.size_bytes, 0)
  return { notes, loading: isPending && !items.length, edit, remove, usedBytes }
}
