import { describe, expect, it } from 'vitest'
import { isDiscarded, keepDiscarded } from './discarded'

const jokes = [{ status: 'Draft' }, { status: 'Discarded' }, { status: null }, { status: ' discarded ' }]

describe('isDiscarded', () => {
  it('matches the Discarded status in any case', () => {
    expect(jokes.map(isDiscarded)).toEqual([false, true, false, true])
  })
})

describe('keepDiscarded', () => {
  it('hides discarded jokes by default and counts them', () => {
    expect(keepDiscarded(jokes, false, false)).toEqual({ kept: [jokes[0], jokes[2]], discarded: 2 })
  })

  it('keeps them all when shown, still counting them', () => {
    expect(keepDiscarded(jokes, true, false)).toEqual({ kept: jokes, discarded: 2 })
  })

  it('stands aside when a status is picked', () => {
    const picked = [jokes[1]]
    expect(keepDiscarded(picked, false, true)).toEqual({ kept: picked, discarded: 0 })
  })

  it('passes the list through when nothing is discarded', () => {
    const none = [jokes[0], jokes[2]]
    expect(keepDiscarded(none, false, false).kept).toBe(none)
  })
})
