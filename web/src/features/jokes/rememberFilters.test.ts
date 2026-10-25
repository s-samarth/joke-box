import { beforeEach, describe, expect, it } from 'vitest'
import { recall, remember } from './rememberFilters'

describe('remembered joke filters', () => {
  beforeEach(() => sessionStorage.clear())

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
