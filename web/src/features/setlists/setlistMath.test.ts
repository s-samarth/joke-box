import { describe, expect, it } from 'vitest'
import { move, positionLabel, progress, totalSeconds } from './setlistMath'

describe('setlist math', () => {
  it('sums durations', () => {
    expect(totalSeconds([{ bitId: 'a', duration: 210 }, { bitId: 'b', duration: 180 }])).toBe(390)
  })

  it('labels the first bit Opener and the last Closer', () => {
    expect([0, 1, 2].map((i) => positionLabel(i, 3))).toEqual(['Opener', null, 'Closer'])
    expect(positionLabel(0, 1)).toBe('Opener')
  })

  it('reports progress against the target', () => {
    expect(progress(390, 900)).toEqual({ percent: 43, bar: 43.333333333333336, over: false })
    expect(progress(390, 300).over).toBe(true)
    expect(progress(390, 300).bar).toBe(100)
  })

  it('moves an item', () => {
    expect(move(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })
})
