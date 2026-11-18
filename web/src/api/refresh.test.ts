/** Refreshing on demand waits for your own saves, then reloads; offline it reloads nothing. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const order: string[] = []
const state = { online: true, queue: Promise.resolve() as Promise<unknown> }

vi.mock('./network', () => ({ isOnline: () => state.online }))
vi.mock('./queryClient', () => ({
  resumeQueued: () => state.queue.then(() => order.push('saves sent')),
  queryClient: { invalidateQueries: vi.fn(async () => { order.push('lists reloaded') }) },
}))

const { refreshNow } = await import('./refresh')
const { queryClient } = await import('./queryClient')

beforeEach(() => {
  order.length = 0
  state.online = true
  state.queue = Promise.resolve()
  vi.mocked(queryClient.invalidateQueries).mockClear()
})
afterEach(() => vi.useRealTimers())

describe('refreshing on demand', () => {
  it('sends waiting saves before reloading, so a change just made never seems to vanish', async () => {
    expect(await refreshNow()).toBe('refreshed')
    expect(order).toEqual(['saves sent', 'lists reloaded'])
  })

  it('reloads nothing offline, and says so', async () => {
    state.online = false
    expect(await refreshNow()).toBe('offline')
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
  })

  it("doesn't wait for good on a save stuck on a weak signal", async () => {
    vi.useFakeTimers()
    state.queue = new Promise(() => {})
    const done = refreshNow(8_000)
    await vi.advanceTimersByTimeAsync(8_000)
    expect(await done).toBe('refreshed')
    expect(order).toEqual(['lists reloaded'])
  })
})
