import { describe, expect, it } from 'vitest'
import { byStrength, strengthLabel } from './jokeMeta'

describe('unrated jokes', () => {
  it('reads as Unrated, not as a number', () => {
    expect(strengthLabel(null)).toBe('Unrated')
    expect(strengthLabel(3)).toBe('Decent')
  })

  it('sorts after every rated joke, strongest or weakest first', () => {
    const ratings = [null, 2, 5, null, 1]
    expect([...ratings].sort((a, b) => byStrength(a, b, true))).toEqual([5, 2, 1, null, null])
    expect([...ratings].sort((a, b) => byStrength(a, b, false))).toEqual([1, 2, 5, null, null])
  })
})
