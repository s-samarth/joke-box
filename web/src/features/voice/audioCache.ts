/**
 * Recordings kept on this device, in IndexedDB, so notes play offline and play instantly the
 * second time. A note recorded here is cached straight away; others are cached on first play.
 *
 * Stored as raw bytes plus the format, not as a Blob, because Safari can return IndexedDB Blobs
 * that read as empty.
 *
 * Pattern: an "object URL" (URL.createObjectURL) gives an in-memory Blob an address an <audio>
 * element can play. We make one per note and reuse it, since each one holds memory until revoked.
 */
import { clear, createStore, del, get, set } from 'idb-keyval'
import { downloadVoiceAudio } from '../../api/voice'

const store = createStore('jokebox-voice-audio', 'audio')
const urls = new Map<string, string>()

interface Cached {
  bytes: ArrayBuffer
  type: string
}

export const cacheAudio = (id: string, bytes: ArrayBuffer, type: string) => set(id, { bytes, type } satisfies Cached, store)

/** Forget every recording on this device (signing out). */
export async function forgetAllAudio(): Promise<void> {
  urls.forEach((url) => URL.revokeObjectURL(url))
  urls.clear()
  await clear(store)
}

export async function forgetAudio(id: string): Promise<void> {
  const url = urls.get(id)
  if (url) URL.revokeObjectURL(url)
  urls.delete(id)
  await del(id, store)
}

/** A playable address for a note's audio: from memory, then this device, then the server. */
export async function audioUrl(id: string): Promise<string> {
  const known = urls.get(id)
  if (known) return known
  let cached = await get<Cached | Blob>(id, store)
  if (!cached || cached instanceof Blob || !cached.bytes.byteLength) {
    const audio = await downloadVoiceAudio(id)
    cached = { bytes: await audio.arrayBuffer(), type: audio.type }
    await cacheAudio(id, cached.bytes, cached.type)
  }
  const url = URL.createObjectURL(new Blob([cached.bytes], { type: cached.type }))
  urls.set(id, url)
  return url
}
