import { describe, expect, it } from 'vitest'
import { fromParts } from './duration'

describe('fromParts', () => {
  it('adds minutes and seconds', () => expect(fromParts('2', '30')).toBe(150))
  it('reads blanks as zero', () => {
    expect(fromParts('', '')).toBe(0)
    expect(fromParts('10', '')).toBe(600)
    expect(fromParts('', '45')).toBe(45)
  })
  it('clamps seconds to 59', () => expect(fromParts('1', '75')).toBe(119))
})
