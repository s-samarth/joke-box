/** One recording waiting in the outbox (outbox.ts), and the small rules about it. */
import type { VoiceNoteInput } from '../../api/types'

export interface PendingNote {
  id: string
  input: VoiceNoteInput
  bytes: ArrayBuffer
  type: string
  created_at: string
  detailsSaved: boolean
  /** Set when the server refused the upload for good (e.g. too large); no more retries. */
  failed?: string
}

/** Notes saved by the first version kept a Blob; those uploads failed, so offer them for deletion. */
export function upgrade(note: PendingNote & { audio?: Blob }): PendingNote {
  if (note.bytes) return note
  return { ...note, bytes: new ArrayBuffer(0), type: note.audio?.type ?? '', failed: 'Recording was lost. Delete it and record again.' }
}

export const sameInput = (a: VoiceNoteInput, b: VoiceNoteInput) => JSON.stringify(a) === JSON.stringify(b)
