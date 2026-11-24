import { onlineManager } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'

const { waiting, live } = vi.hoisted(() => ({
  waiting: new Map<string, { id: string; created_at: string; bytes: ArrayBuffer }>(),
  live: new Set(['full', 'good', 'already-saved']),
}))
let storageFull = true
vi.mock('idb-keyval', () => ({
  createStore: () => ({}), get: vi.fn(), del: vi.fn(), clear: vi.fn(),
  values: async () => [...waiting.values()],
  set: async (id: string, note: { id: string; created_at: string; bytes: ArrayBuffer }) => {
    if (id === 'full' && storageFull) throw new DOMException('Full', 'QuotaExceededError')
    waiting.set(id, note)
  },
}))
vi.mock('./inProgress', () => ({
  interrupted: async () => [...live].map((id) => ({ id, seconds: 2, startedAt: new Date(1), audio: new Blob(['synthetic']) })),
  forgetLive: async (id: string) => { live.delete(id) },
  clearLive: async () => { live.clear() },
}))
vi.mock('./audioCache', () => ({ cacheAudio: async () => {} }))

it('keeps failed recoveries, removes only durable copies, and can retry offline', async () => {
  onlineManager.setOnline(false)
  const { startOutbox } = await import('./outbox')
  waiting.set('already-saved', { id: 'already-saved', created_at: new Date(1).toISOString(), bytes: new ArrayBuffer(4) })
  await startOutbox(true)
  expect([...live]).toEqual(['full'])
  expect([...waiting.keys()]).toEqual(['already-saved', 'good'])
  storageFull = false
  await startOutbox(true)
  expect(live.size).toBe(0)
  expect([...waiting.keys()]).toEqual(['already-saved', 'good', 'full'])
})
