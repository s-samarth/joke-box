import { afterEach, describe, expect, it, vi } from 'vitest'
import { SAVED_OFFLINE, announceSave } from './announce'

afterEach(() => vi.useRealTimers())

describe('announceSave', () => {
  it('says saved once the server confirms in time', async () => {
    const toast = vi.fn()
    announceSave(Promise.resolve(), toast, 'Show logged')
    await vi.waitFor(() => expect(toast).toHaveBeenCalledWith('Show logged', undefined))
  })

  it('says it is waiting on the phone when the server is slow (one bar of signal)', async () => {
    vi.useFakeTimers()
    const toast = vi.fn()
    announceSave(new Promise(() => {}), toast, 'Show logged')
    await vi.advanceTimersByTimeAsync(1_600)
    expect(toast).toHaveBeenCalledWith(SAVED_OFFLINE, undefined)
  })

  it('leaves failures to the caller', async () => {
    const toast = vi.fn()
    announceSave(Promise.reject(new Error('no')), toast, 'Show logged')
    await new Promise((r) => setTimeout(r, 10))
    expect(toast).not.toHaveBeenCalled()
  })
})
