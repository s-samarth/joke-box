import { describe, expect, it } from 'vitest'
import { ApiError } from './client'
import { NetworkError } from './network'
import { QUEUED, retrySync } from './sync'

describe('retrySync', () => {
  it('keeps trying a save that never reached the server', () => {
    expect(retrySync(0, new NetworkError())).toBe(true)
    expect(retrySync(19, new NetworkError())).toBe(true)
    expect(retrySync(3, new TypeError('Load failed'))).toBe(true)
  })

  it('gives up on a save that keeps failing while the server is up, so it stops blocking the queue', () => {
    expect(retrySync(20, new NetworkError())).toBe(false)
  })

  it('gives a server hiccup a few more tries, then stops', () => {
    expect(retrySync(0, new ApiError(502, 'Bad gateway'))).toBe(true)
    expect(retrySync(2, new ApiError(429, 'Slow down'))).toBe(true)
    expect(retrySync(3, new ApiError(500, 'Oops'))).toBe(false)
  })

  it('waits, a minute at a time, for you to sign in again', () => {
    expect(retrySync(500, new ApiError(401, 'Sign in'))).toBe(true)
    expect(QUEUED.retryDelay(3, new ApiError(401, 'Sign in'))).toBe(60_000)
  })

  it("doesn't retry a refusal, which won't change", () => {
    expect(retrySync(0, new ApiError(422, 'Please check the form'))).toBe(false)
    expect(retrySync(0, new ApiError(404, 'Not found'))).toBe(false)
    expect(retrySync(0, new Error('bug'))).toBe(false)
  })
})

describe('QUEUED', () => {
  it('waits offline and sends saves one at a time', () => {
    expect(QUEUED.networkMode).toBe('online')
    expect(QUEUED.scope.id).toBe('sync')
    expect(QUEUED.retryDelay(0, new NetworkError())).toBe(1000)
    expect(QUEUED.retryDelay(10, new NetworkError())).toBe(30_000)
  })
})

describe('uploadLimit', () => {
  it('gives a recording time to crawl up on one bar, but not forever', async () => {
    const { uploadLimit } = await import('./voice')
    expect(uploadLimit(0)).toBe(60_000)
    expect(uploadLimit(2_000_000)).toBe(160_000) // a 2 MB note: a minute plus 100 s
    expect(uploadLimit(500_000_000)).toBe(15 * 60_000)
  })
})
