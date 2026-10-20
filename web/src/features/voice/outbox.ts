/**
 * The outbox: recordings waiting to reach the server. Every recording goes through here, online
 * or not. It's saved on the phone first (so nothing is lost if the upload fails or you're on a
 * plane), then uploaded in two steps: the details, then the audio.
 *
 * The audio is kept as raw bytes (an ArrayBuffer), not a Blob: Safari can hand back a Blob from
 * IndexedDB that reads as empty, which uploaded as "The recording is empty".
 *
 * Pattern: a tiny "external store". The state lives in this module, not in React; components
 * read it with useSyncExternalStore, which re-renders them whenever `emit` swaps in new state.
 */
import { createStore, del, get, set, values } from 'idb-keyval'
import { useSyncExternalStore } from 'react'
import { ApiError } from '../../api/client'
import { keys, queryClient } from '../../api/queryClient'
import type { VoiceNoteInput } from '../../api/types'
import { deleteVoiceNote, saveVoiceDetails, uploadVoiceAudio } from '../../api/voice'
import { cacheAudio } from './audioCache'

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

/** Notes saved by the first version kept a Blob; those uploads failed, so offer them for deletion. */
function upgrade(note: PendingNote & { audio?: Blob }): PendingNote {
  if (note.bytes) return note
  return { ...note, bytes: new ArrayBuffer(0), type: note.audio?.type ?? '', failed: 'Recording was lost. Delete it and record again.' }
}

async function reload() {
  const items = (await values<PendingNote>(store)).map(upgrade)
  emit({ items: items.sort((a, b) => b.created_at.localeCompare(a.created_at)) })
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useOutbox = () => useSyncExternalStore(subscribe, () => state)

export class EmptyRecordingError extends Error {}

export async function addRecording(id: string, audio: Blob, durationSeconds: number): Promise<void> {
  const bytes = await audio.arrayBuffer()
  if (!bytes.byteLength) throw new EmptyRecordingError('The recording came out empty')
  const type = audio.type || 'audio/mp4'
  const note: PendingNote = {
    id, bytes, type, detailsSaved: false, created_at: new Date().toISOString(),
    input: { label: '', hashtags: [], duration_seconds: durationSeconds },
  }
  await set(id, note, store)
  await cacheAudio(id, bytes, type)
  await reload()
  void flush()
}

/** Edit a note still in the outbox. Returns false if it has already uploaded (edit it there). */
export async function editPending(id: string, input: VoiceNoteInput): Promise<boolean> {
  const note = await get<PendingNote>(id, store)
  if (!note) return false
  await set(id, { ...note, input, detailsSaved: false }, store)
  await reload()
  void flush()
  return true
}

/* Notes deleted while waiting. An upload already in flight checks this and cleans up after itself. */
const discarded = new Set<string>()

/** Drop a note from the outbox; returns it if it was there. */
export async function discardPending(id: string): Promise<PendingNote | undefined> {
  const note = await get<PendingNote>(id, store)
  discarded.add(id)
  await del(id, store)
  await reload()
  return note
}

const sameInput = (a: VoiceNoteInput, b: VoiceNoteInput) => JSON.stringify(a) === JSON.stringify(b)

/** Upload one note. Re-reads it between steps, since it may be edited or deleted meanwhile. */
async function send(note: PendingNote): Promise<void> {
  const gone = async () => {
    if (!discarded.has(note.id)) return false
    await deleteVoiceNote(note.id).catch(() => {}) // remove anything that reached the server
    return true
  }
  if (!note.detailsSaved) {
    await saveVoiceDetails(note.id, note.input)
    if (await gone()) return
    const now = await get<PendingNote>(note.id, store)
    // Only mark the details sent if they weren't edited while we were sending them.
    if (now && sameInput(now.input, note.input)) await set(note.id, { ...now, detailsSaved: true }, store)
  }
  await uploadVoiceAudio(note.id, new Blob([note.bytes], { type: note.type }))
  if (await gone()) return
  const latest = await get<PendingNote>(note.id, store)
  if (latest && !latest.detailsSaved) await saveVoiceDetails(note.id, latest.input) // edits made mid-upload
  await del(note.id, store)
}

let running = false

/** Upload everything waiting, oldest first. Safe to call often: it runs one pass at a time. */
export async function flush(): Promise<void> {
  if (running || !navigator.onLine) return
  running = true
  try {
    for (const note of [...state.items].reverse()) {
      if (note.failed || discarded.has(note.id)) continue
      emit({ uploading: note.id })
      try {
        await send(note)
      } catch (e) {
        if (discarded.has(note.id)) continue
        const now = (await get<PendingNote>(note.id, store)) ?? note
        // 404: the server lost the details (deleted elsewhere?), so send them again next time.
        if (e instanceof ApiError && e.status === 404) {
          await set(note.id, { ...now, detailsSaved: false }, store)
          break
        }
        // Other 4xx (too large, not audio) won't get better by retrying; the rest waits for next time.
        const permanent = e instanceof ApiError && e.status >= 400 && e.status < 500 && ![401, 408, 429].includes(e.status)
        if (!permanent) break
        await set(note.id, { ...now, failed: e.message }, store)
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
