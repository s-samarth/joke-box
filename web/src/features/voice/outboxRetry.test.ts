/** The outbox keeps going while the app stays open (made-up audio bytes). */
import { onlineManager } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'

const { store } = vi.hoisted(() => ({ store: new Map<string, unknown>() }))
vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  get: async (id: string) => store.get(id),
  set: async (id: string, v: unknown) => { store.set(id, v) },
  del: async (id: string) => { store.delete(id) },
  clear: async () => store.clear(),
  values: async () => [...store.values()],
}))
vi.mock('./inProgress', () => ({ interrupted: async () => [], forgetLive: async () => {}, clearLive: async () => {} }))
vi.mock('./audioCache', () => ({ cacheAudio: async () => {} }))

let release: (() => void) | null = null
let fail500 = false
const audio = (n: number) => new Blob([`fake-audio-${n}`.padEnd(40, 'x')])

it('sends a note recorded during an upload, and tries again 30 seconds after a server error', async () => {
  onlineManager.setOnline(true)
  vi.stubGlobal('fetch', async (path: string) => {
    if (fail500) return new Response('oops', { status: 500 })
    if (path.endsWith('/audio') && path.includes('first')) await new Promise<void>((r) => { release = r })
    return Response.json({ id: 'x' })
  })
  const { addRecording } = await import('./outbox')
  await addRecording('first', audio(1), 3, '', new Date('2026-11-25T10:00:00Z'))
  await vi.waitFor(() => expect(release).not.toBeNull()) // the first is still uploading
  await addRecording('second', audio(2), 4, '', new Date('2026-11-25T10:01:00Z'))
  release!()
  await vi.waitFor(() => expect([...store.keys()]).toEqual([]))

  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  fail500 = true
  await addRecording('third', audio(3), 2, '', new Date('2026-11-25T10:02:00Z'))
  await vi.waitFor(() => expect([...store.keys()]).toEqual(['third']))
  fail500 = false
  await vi.advanceTimersByTimeAsync(30_000)
  vi.useRealTimers()
  await vi.waitFor(() => expect([...store.keys()]).toEqual([]))
})
