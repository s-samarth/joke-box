/**
 * The outbox: recordings waiting to reach the server. Every recording goes through here, online
 * or not. It's saved on the phone first (so nothing is lost if the upload fails or you're on a
 * plane), then uploaded in two steps: the details, then the audio.
 *
 * Pattern: a tiny "external store". The state lives in this module, not in React; components
 * read it with useSyncExternalStore, which re-renders them whenever `emit` swaps in new state.
 */
import { createStore, del, set, values } from 'idb-keyval'
import { useSyncExternalStore } from 'react'
import { ApiError } from '../../api/client'
import { keys, queryClient } from '../../api/queryClient'
import type { VoiceNoteInput } from '../../api/types'
import { saveVoiceDetails, uploadVoiceAudio } from '../../api/voice'
import { cacheAudio } from './audioCache'

export interface PendingNote {
  id: string
  input: VoiceNoteInput
  audio: Blob
  created_at: string
  detailsSaved: boolean
  /** Set when the server refused the upload for good (e.g. too large); no more retries. */
  failed?: string
}

interface OutboxState {
  items: PendingNote[]
  uploading: string | null
}

const store = createStore('jokebox-voice-outbox', 'pending')
let state: OutboxState = { items: [], uploading: null }
const listeners = new Set<() => void>()

function emit(next: Partial<OutboxState>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

async function reload() {
  const items = await values<PendingNote>(store)
  emit({ items: items.sort((a, b) => b.created_at.localeCompare(a.created_at)) })
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useOutbox = () => useSyncExternalStore(subscribe, () => state)

export async function addRecording(id: string, audio: Blob, durationSeconds: number): Promise<void> {
  const note: PendingNote = {
    id, audio, detailsSaved: false, created_at: new Date().toISOString(),
    input: { label: '', hashtags: [], duration_seconds: durationSeconds },
  }
  await set(id, note, store)
  await cacheAudio(id, audio)
  await reload()
  void flush()
}

/** Edit a note that hasn't uploaded yet. Its details are sent again on the next try. */
export async function editPending(id: string, input: VoiceNoteInput): Promise<void> {
  const note = state.items.find((n) => n.id === id)
  if (!note) return
  await set(id, { ...note, input, detailsSaved: false }, store)
  await reload()
  void flush()
}

export async function discardPending(id: string): Promise<void> {
  await del(id, store)
  await reload()
}

let running = false

/** Upload everything waiting, oldest first. Safe to call often: it runs one pass at a time. */
export async function flush(): Promise<void> {
  if (running || !navigator.onLine) return
  running = true
  try {
    for (const note of [...state.items].reverse()) {
      if (note.failed) continue
      emit({ uploading: note.id })
      try {
        if (!note.detailsSaved) {
          await saveVoiceDetails(note.id, note.input)
          note.detailsSaved = true
          await set(note.id, note, store)
        }
        await uploadVoiceAudio(note.id, note.audio)
        await del(note.id, store)
      } catch (e) {
        // 404: the server lost the details (deleted elsewhere?), so send them again next time.
        if (e instanceof ApiError && e.status === 404) {
          await set(note.id, { ...note, detailsSaved: false }, store)
          break
        }
        // Other 4xx (too large, not audio) won't get better by retrying; the rest waits for next time.
        const permanent = e instanceof ApiError && e.status >= 400 && e.status < 500 && ![401, 408, 429].includes(e.status)
        if (!permanent) break
        await set(note.id, { ...note, failed: e.message }, store)
      }
    }
  } finally {
    running = false
    emit({ uploading: null })
    await reload()
    void queryClient.invalidateQueries({ queryKey: keys.voiceNotes })
  }
}

// Load what's waiting when the app starts, and retry whenever the connection comes back.
void reload().then(flush)
if (typeof window !== 'undefined') window.addEventListener('online', () => void flush())
