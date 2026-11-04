import { describe, expect, it, vi } from 'vitest'
import { freshCopy, isStaleBuild, shouldRepair, withoutLists } from './recover'

describe('crash recovery', () => {
  it('spots an old copy of the app missing a file, in each browser', () => {
    expect(isStaleBuild(new TypeError('Failed to fetch dynamically imported module: https://x/assets/JokePage-abc.js'))).toBe(true)
    expect(isStaleBuild(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isStaleBuild(new Error('error loading dynamically imported module'))).toBe(true)
    expect(isStaleBuild(new Error('Unable to preload CSS for /assets/x.css'))).toBe(true)
    expect(isStaleBuild(new TypeError("Cannot read properties of undefined (reading 'map')"))).toBe(false)
  })

  it('repairs on its own once, not in a loop', () => {
    expect(shouldRepair(null, 1_000_000)).toBe(true)
    expect(shouldRepair(1_000_000, 1_030_000)).toBe(false)
    expect(shouldRepair(1_000_000, 1_090_000)).toBe(true)
  })

  it("keeps the installed app when the server can't be reached, even if the phone says online", async () => {
    const deleted: string[] = []
    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal('fetch', async () => { throw new TypeError('Failed to fetch') })
    vi.stubGlobal('caches', { keys: async () => ['app'], delete: async (k: string) => { deleted.push(k); return true } })
    expect(await freshCopy({ onlyIfReachable: true })).toBe('offline')
    expect(deleted).toEqual([])
    vi.unstubAllGlobals()
  })

  it('drops the saved lists and keeps the waiting saves', () => {
    const saved = JSON.stringify({ buster: 'v1', clientState: { queries: [{ queryKey: ['jokes'] }], mutations: [{ mutationKey: ['fake'] }] } })
    expect(JSON.parse(withoutLists(saved))).toEqual({ buster: 'v1', clientState: { queries: [], mutations: [{ mutationKey: ['fake'] }] } })
  })
})
