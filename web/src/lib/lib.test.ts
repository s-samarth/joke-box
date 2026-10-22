import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import { clock, long, nudge, parse } from './duration'
import { byDate, groupByMonth, monthOf } from './months'
import { fromIstInput, toIstInput } from './time'

describe('duration', () => {
  it('formats', () => {
    expect(clock(150)).toBe('2:30')
    expect(clock(5)).toBe('0:05')
    expect(clock(3725)).toBe('1:02:05')
    expect(long(150)).toBe('2m 30s')
    expect(long(3900)).toBe('1h 05m')
  })

  it('parses what people type', () => {
    expect(parse('2:30')).toBe(150)
    expect(parse('2m 30s')).toBe(150)
    expect(parse('45s')).toBe(45)
    expect(parse('3m')).toBe(180)
    expect(parse('90')).toBe(90)
    expect(parse('')).toBe(0)
    expect(parse('soon')).toBeNull()
  })
})

describe('runtime stepper', () => {
  it('steps 15s under 2m, 30s up to 5m, then a minute, on the grid', () => {
    expect(nudge(15, true)).toBe(30)
    expect(nudge(20, true)).toBe(30)
    expect(nudge(20, false)).toBe(15)
    expect(nudge(120, true)).toBe(150)
    expect(nudge(120, false)).toBe(105)
    expect(nudge(300, false)).toBe(270)
    expect(nudge(300, true)).toBe(360)
  })
  it('never goes below zero', () => {
    expect(nudge(0, false)).toBe(0)
    expect(nudge(10, false)).toBe(0)
  })
})

describe('IST conversion', () => {
  it('round-trips through the datetime input', () => {
    expect(toIstInput('2026-10-01T15:00:00Z')).toBe('2026-10-01T20:30')
    expect(new Date(fromIstInput('2026-10-01T20:30')).toISOString()).toBe('2026-10-01T15:00:00.000Z')
  })
})

describe('csv', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(toCsv(['a', 'b'], [['x, y', 'say "hi"\nok']])).toBe('a,b\n"x, y","say ""hi""\nok"')
  })
})

describe('months', () => {
  const items = [
    { at: '2025-03-31T19:00:00Z' }, // 1 April in IST
    { at: '2026-10-21T10:00:00Z' },
    { at: '2025-03-02T10:00:00Z' },
    { at: '2026-10-01T10:00:00Z' },
  ]
  const at = (i: { at: string }) => i.at

  it('groups newest first into IST months, with readable labels', () => {
    const groups = groupByMonth([...items].sort(byDate(at, 'new')), at)
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([['October 2026', 2], ['April 2025', 1], ['March 2025', 1]])
  })

  it('flips to oldest first', () => {
    expect(groupByMonth([...items].sort(byDate(at, 'old')), at).map((g) => g.key)).toEqual(['2025-03', '2025-04', '2026-10'])
    expect(monthOf('2026-12-31T19:00:00Z')).toBe('2027-01')
    expect(groupByMonth([], at)).toEqual([])
  })
})
