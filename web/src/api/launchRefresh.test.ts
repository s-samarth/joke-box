/** After launch, lists from the saved copy refresh once; lists fetched since launch don't again. */
import { expect, it, vi } from 'vitest'

vi.mock('idb-keyval', () => ({ get: async () => undefined, set: async () => {}, del: async () => {} }))
vi.mock('./session', () => ({ checkAccount: async () => {} }))

const { afterRestore } = await import('./launch')
const { queryClient } = await import('./queryClient')

it('refreshes only lists older than the launch', async () => {
  queryClient.setQueryData(['fake-saved-list'], [], { updatedAt: Date.now() - 60 * 60_000 })
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(Date.now() + 1)
  afterRestore()
  queryClient.setQueryData(['fake-fetched-since'], [])
  vi.useRealTimers()
  await vi.waitFor(() => expect(queryClient.getQueryState(['fake-saved-list'])?.isInvalidated).toBe(true))
  expect(queryClient.getQueryState(['fake-fetched-since'])?.isInvalidated).toBe(false)
})
