import { describe, expect, it } from 'vitest'
import { cycle, matchesPicks, NO_PICKS } from './pickMatch'

const joke = (status: string | null, clean_rating: 'clean' | 'mild' | 'dirty' | null = null) => ({ status, clean_rating })

describe('matchesPicks', () => {
  it('keeps everything with nothing picked', () => {
    expect(matchesPicks(joke(null), NO_PICKS)).toBe(true)
  })
  it('keeps any of the "only" statuses', () => {
    const p = { status: { 'Stage Ready': 'only', Interesting: 'only' } as const, clean: {} }
    expect(matchesPicks(joke('Stage Ready'), p)).toBe(true)
    expect(matchesPicks(joke('Interesting'), p)).toBe(true)
    expect(matchesPicks(joke('Draft'), p)).toBe(false)
    expect(matchesPicks(joke(null), p)).toBe(false)
  })
  it('hides "not" values, including no status', () => {
    const p = { status: { Draft: 'not', '': 'not' } as const, clean: {} }
    expect(matchesPicks(joke('Draft'), p)).toBe(false)
    expect(matchesPicks(joke(null), p)).toBe(false)
    expect(matchesPicks(joke('Stage Ready'), p)).toBe(true)
  })
  it('needs both status and clean rating to pass', () => {
    const p = { status: { 'Stage Ready': 'only' } as const, clean: { dirty: 'not' } as const }
    expect(matchesPicks(joke('Stage Ready', 'clean'), p)).toBe(true)
    expect(matchesPicks(joke('Stage Ready', 'dirty'), p)).toBe(false)
  })
})

describe('cycle', () => {
  it('goes off, only, not, off', () => {
    const a = cycle({}, 'Draft')
    const b = cycle(a, 'Draft')
    expect(a).toEqual({ Draft: 'only' })
    expect(b).toEqual({ Draft: 'not' })
    expect(cycle(b, 'Draft')).toEqual({})
  })
})
