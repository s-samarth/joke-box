/** Big uploads: given time to get through on a slow signal, and refused before uploading when the host would refuse them. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, MAX_BODY, api, timeoutFor } from './client'

afterEach(() => vi.unstubAllGlobals())

describe('big requests', () => {
  it('gives a big upload longer, and an ordinary request the usual 20 seconds', () => {
    expect(timeoutFor(0)).toBe(20_000)
    expect(timeoutFor(2_000)).toBe(21_000)
    expect(timeoutFor(4_000_000)).toBe(100_000)
    expect(timeoutFor(50_000_000)).toBe(120_000)
  })

  it("refuses a body the host would refuse, without uploading it", async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    // Random letters barely pack, so this stays over the limit even gzip-packed.
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'
    const text = Array.from({ length: MAX_BODY * 2 }, () => letters[Math.floor(Math.random() * 64)]).join('')
    const refused: unknown = await api('/api/sessions/s1', 'PUT', { text }).catch((e: unknown) => e)
    expect(refused).toBeInstanceOf(ApiError)
    expect(refused).toMatchObject({ status: 413 })
    expect(fetch).not.toHaveBeenCalled()
  })
})
