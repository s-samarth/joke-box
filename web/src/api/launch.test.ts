/**
 * Launch: the app finishes loading while saves from before still replay, and the saved copy is
 * only written back once it has loaded (never an empty cache over it).
 */
import { describe, expect, it, vi } from 'vitest'

const written = vi.hoisted(() => [] as [string, string][])
vi.mock('idb-keyval', () => ({
  get: async () => undefined,
  set: async (key: string, value: string) => { written.push([key, value]) },
  del: async () => {},
}))
// Signed in on a weak signal: the account check (and so the waiting saves) never finishes.
vi.mock('./session', () => ({ checkAccount: () => new Promise(() => {}) }))

const { afterRestore } = await import('./launch')
const { saveNow } = await import('./persist')
const { CACHE_KEY } = await import('./queryClient')

describe('launch', () => {
  it("doesn't write the saved copy before it has loaded", async () => {
    await saveNow()
    expect(written).toEqual([])
  })

  it('lets the app finish loading while the waiting saves are still out', () => {
    // A promise here would hold the app "restoring": no fetches, nothing written to the phone.
    expect(afterRestore()).toBeUndefined()
  })

  it('then writes the saved copy straight away, in the persister\'s format', async () => {
    await saveNow()
    expect(written.map(([key]) => key)).toEqual([CACHE_KEY])
    expect(JSON.parse(written[0][1])).toMatchObject({ buster: 'v1', clientState: { mutations: [], queries: [] } })
  })
})
