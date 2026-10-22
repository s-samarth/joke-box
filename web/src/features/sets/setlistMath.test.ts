import { describe, expect, it } from 'vitest'
import { draftItems, lightState, move, optionalSeconds, positionLabel, progress, totalSeconds } from './setlistMath'

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

  it('turns the light on inside the last minute', () => {
    expect(lightState(300, 420)).toBe('ok')
    expect(lightState(360, 420)).toBe('light')
    expect(lightState(421, 420)).toBe('over')
  })

  it('moves an item', () => {
    expect(move(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })
})

describe('optional jokes', () => {
  const items = [{ bitId: 'a', duration: 60 }, { bitId: 'b', duration: 30, optional: true }, { bitId: 'c', duration: 45 }]
  it("don't count towards the slot", () => expect(totalSeconds(items)).toBe(105))
  it('show their own time', () => expect(optionalSeconds(items)).toBe(30))
  it('read from a saved set, old ones too', () =>
    expect(draftItems([{ bit_id: 'a', duration_seconds: 5 }, { bit_id: 'b', duration_seconds: 7, optional: true }])).toEqual([
      { bitId: 'a', duration: 5, optional: false }, { bitId: 'b', duration: 7, optional: true },
    ]))
})
