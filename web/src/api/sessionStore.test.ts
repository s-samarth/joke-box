/** Session ink lives under its own key, not in the saved copy written at every change (made-up ink). */
import { dehydrate } from '@tanstack/react-query'
import { expect, it, vi } from 'vitest'

const { kept } = vi.hoisted(() => ({ kept: new Map<string, unknown>([['old', { data: { id: 'old', ink: [] }, at: 5 }]]) }))
vi.mock('idb-keyval', () => ({
  createStore: () => ({}),
  get: async () => undefined,
  set: async (id: string, v: unknown) => { kept.set(id, v) },
  del: async (id: string) => { kept.delete(id) },
  clear: async () => kept.clear(),
  entries: async () => [...kept.entries()],
}))

const { queryClient, sessionKey } = await import('./queryClient')
const { sessionsRestored } = await import('./sessionStore')
const { persistOptions } = await import('./persist')

it('reads kept sessions back, writes changed ones alone, and leaves them out of the saved copy', async () => {
  await sessionsRestored
  expect(queryClient.getQueryData(sessionKey('old'))).toEqual({ id: 'old', ink: [] })
  queryClient.setQueryData(sessionKey('new'), { id: 'new', ink: [{ points: [] }] })
  await vi.waitFor(() => expect(kept.has('new')).toBe(true))
  queryClient.removeQueries({ queryKey: sessionKey('old') })
  await vi.waitFor(() => expect(kept.has('old')).toBe(false))
  queryClient.setQueryData(['jokes'], [])
  const saved = dehydrate(queryClient, persistOptions.dehydrateOptions).queries.map((q) => q.queryKey[0])
  expect(saved).toContain('jokes')
  expect(saved).not.toContain('session-detail')
})
