import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recall, remember } from './rememberFilters'

/** Node before 25 has no sessionStorage (CI runs 22), so the tests bring an in-memory one. */
function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() { return data.size },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => { data.delete(k) },
    setItem: (k, v) => { data.set(k, String(v)) },
  }
}

describe('remembered joke filters', () => {
  beforeEach(() => vi.stubGlobal('sessionStorage', memoryStorage()))

  it('come back within the hour, then lapse', () => {
    remember('topic=t1&status=Draft')
    expect(recall()).toBe('topic=t1&status=Draft')
    expect(recall(Date.now() + 61 * 60 * 1000)).toBe('')
  })
  it('are forgotten when cleared', () => {
    remember('topic=t1')
    remember('')
    expect(recall()).toBe('')
  })
})
