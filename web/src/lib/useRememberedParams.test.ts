import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recall, remember } from './sessionMemory'
import { filtersOf, withFilters } from './useRememberedParams'

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

describe('remembered list filters', () => {
  beforeEach(() => vi.stubGlobal('sessionStorage', memoryStorage()))

  it('come back within the hour, then lapse', () => {
    remember('jokes-filters', 'topic=t1&status=Draft')
    expect(recall('jokes-filters')).toBe('topic=t1&status=Draft')
    expect(recall('jokes-filters', Date.now() + 61 * 60 * 1000)).toBeUndefined()
  })
  it('are forgotten when cleared', () => {
    remember('jokes-filters', 'topic=t1')
    remember('jokes-filters', '')
    expect(recall('jokes-filters') || '').toBe('')
  })
  it('are kept apart per list', () => {
    remember('jokes-filters', 'topic=t1')
    remember('observations-filters', 'kind=k2')
    expect(recall('jokes-filters')).toBe('topic=t1')
    expect(recall('observations-filters')).toBe('kind=k2')
  })
})

describe('filtersOf', () => {
  it('leaves out params that are not filters', () => {
    expect(filtersOf(new URLSearchParams('topic=t1&new=1&q=dog'), ['new'])).toBe('topic=t1&q=dog')
  })
  it('is empty when only a sheet is open', () => {
    expect(filtersOf(new URLSearchParams('new=1'), ['new'])).toBe('')
  })
})

describe('withFilters', () => {
  it('puts the remembered filters back and keeps an open sheet', () => {
    expect(withFilters(new URLSearchParams('new=1'), 'topic=t1&unused=1').toString()).toBe('topic=t1&unused=1&new=1')
  })
  it('brings them back to a bare list as they were', () => {
    expect(withFilters(new URLSearchParams(), 'topic=t1&sub=s2&q=dog').toString()).toBe('topic=t1&sub=s2&q=dog')
  })
})
