import { describe, expect, it } from 'vitest'
import { ApiError } from './client'
import { NetworkError } from './network'
import { QUEUED, retrySync } from './sync'

describe('retrySync', () => {
  it('keeps trying a save that never reached the server', () => {
    expect(retrySync(0, new NetworkError())).toBe(true)
    expect(retrySync(50, new NetworkError())).toBe(true)
    expect(retrySync(3, new TypeError('Load failed'))).toBe(true)
  })

  it('gives a server hiccup a few more tries, then stops', () => {
    expect(retrySync(0, new ApiError(502, 'Bad gateway'))).toBe(true)
    expect(retrySync(2, new ApiError(429, 'Slow down'))).toBe(true)
    expect(retrySync(3, new ApiError(500, 'Oops'))).toBe(false)
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
    expect(QUEUED.retryDelay(0)).toBe(1000)
    expect(QUEUED.retryDelay(10)).toBe(30_000)
  })
})
