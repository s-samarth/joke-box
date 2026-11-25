/** An outbox with nothing waiting leaves the voice notes list alone (made-up data). */
import { onlineManager } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'
import { queryClient } from '../../api/queryClient'

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

it("doesn't refetch voice notes when nothing was waiting to upload, and does after an upload", async () => {
  onlineManager.setOnline(true)
  vi.stubGlobal('fetch', async () => Response.json({ id: 'x' }))
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const { addRecording, flush } = await import('./outbox')
  await flush()
  expect(invalidate).not.toHaveBeenCalled()
  await addRecording('fake-note', new Blob(['fake-audio'.padEnd(40, 'x')]), 3, '', new Date('2026-11-25T10:00:00Z'))
  await vi.waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['voice-notes'] }))
})
