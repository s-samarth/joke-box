import { describe, expect, it } from 'vitest'
import type { Bit } from '../../api/types'
import { daysBetween, habit, jokesByDay, monthWeeks, moodFor, shiftMonth } from './dailyMath'

const TODAY = '2026-10-21'

describe('daily joke habit', () => {
  it('turns from green to yellow to red to gone as the days pass', () => {
    expect([0, 1, 2, 3, 7, 8, 40, null].map(moodFor)).toEqual(['done', 'due', 'due', 'slipping', 'slipping', 'gone', 'gone', 'due'])
  })

  it('counts the streak up to today, or up to yesterday while today is still open', () => {
    expect(habit(['2026-10-19', '2026-10-20', '2026-10-21'], TODAY)).toEqual({ gap: 0, current: 3, longest: 3, mood: 'done' })
    expect(habit(['2026-10-19', '2026-10-20'], TODAY)).toMatchObject({ gap: 1, current: 2, mood: 'due' })
    expect(habit(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-17'], TODAY)).toEqual({ gap: 4, current: 0, longest: 3, mood: 'slipping' })
    expect(habit([], TODAY)).toEqual({ gap: null, current: 0, longest: 0, mood: 'due' })
  })

  it('reads days in IST and ignores duplicates', () => {
    const bit = (created_at: string) => ({ id: created_at, created_at }) as Bit
    const days = jokesByDay([bit('2026-10-20T19:00:00Z'), bit('2026-10-21T05:00:00Z')])
    expect([...days.keys()]).toEqual(['2026-10-21']) // 19:00 UTC on the 20th is past midnight IST
    expect(days.get('2026-10-21')).toHaveLength(2)
    expect(habit(['2026-10-21', '2026-10-21'], TODAY).current).toBe(1)
  })

  it('lays out a month in Monday-first weeks', () => {
    const weeks = monthWeeks('2026-10') // 1 Oct 2026 is a Thursday
    expect(weeks[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
    expect(weeks.flat().filter(Boolean)).toHaveLength(31)
    expect([shiftMonth('2026-01', -1), shiftMonth('2026-12', 1)]).toEqual(['2025-12', '2027-01'])
    expect(daysBetween('2026-02-27', '2026-03-01')).toBe(2)
  })
})
