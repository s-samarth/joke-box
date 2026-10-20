/**
 * Recordings kept on this device, in IndexedDB, so notes play offline and play instantly the
 * second time. A note recorded here is cached straight away; others are cached on first play.
 *
 * Pattern: an "object URL" (URL.createObjectURL) gives an in-memory Blob an address an <audio>
 * element can play. We make one per note and reuse it, since each one holds memory until revoked.
 */
import { createStore, del, get, set } from 'idb-keyval'
import { downloadVoiceAudio } from '../../api/voice'

const store = createStore('jokebox-voice-audio', 'audio')
const urls = new Map<string, string>()

export const cacheAudio = (id: string, audio: Blob) => set(id, audio, store)

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
  let audio = await get<Blob>(id, store)
  if (!audio) {
    audio = await downloadVoiceAudio(id)
    await cacheAudio(id, audio)
  }
  const url = URL.createObjectURL(audio)
  urls.set(id, url)
  return url
}
