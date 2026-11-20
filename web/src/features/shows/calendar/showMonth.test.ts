import { describe, expect, it } from 'vitest'
import type { PerformanceLog } from '../../../api/types'
import { showsByDay } from '../insights/timelineMath'
import { dayMinutes, monthLine, monthStats, stageHeat, stageStreak, stageTotal } from './showMonth'

const show = (performed_at: string, duration_seconds: number) => ({ id: performed_at, performed_at, duration_seconds }) as PerformanceLog

describe('show calendar', () => {
  const days = showsByDay([
    show('2026-11-07T14:00:00Z', 480),
    show('2026-11-07T16:30:00Z', 600), // two shows on the 7th
    show('2026-11-30T19:00:00Z', 300), // 00:30 on 1 Dec in IST
    show('2026-10-31T15:00:00Z', 420),
  ])

  it('counts a month by IST day', () => {
    expect(monthStats(days, '2026-11')).toEqual({ shows: 2, seconds: 1080, days: 1 })
    expect(monthStats(days, '2026-12')).toEqual({ shows: 1, seconds: 300, days: 1 })
    expect(monthStats(days, '2026-09')).toEqual({ shows: 0, seconds: 0, days: 0 })
  })

  it('writes the month line', () => {
    expect(monthLine({ shows: 10, seconds: 5520, days: 8 })).toBe('10 shows · 1h 32m on stage · up on 8 days')
    expect(monthLine({ shows: 1, seconds: 420, days: 1 })).toBe('1 show · 7 min on stage · up on 1 day')
    expect(monthLine({ shows: 0, seconds: 0, days: 0 })).toBe('No shows')
  })

  it('rounds minutes, never showing a short spot as 0m', () => {
    expect(dayMinutes(1080)).toBe('18m')
    expect(dayMinutes(20)).toBe('1m')
    expect(stageTotal(3900)).toBe('1h 05m')
  })

  it('deepens the gold with minutes on stage', () => {
    expect([300, 301, 600, 1200, 1201].map(stageHeat)).toEqual([1, 2, 2, 3, 4])
  })

  it('counts a stage streak in IST, alive until a day is missed', () => {
    const run = showsByDay([
      show('2026-11-10T14:00:00Z', 300), show('2026-11-11T14:00:00Z', 300), show('2026-11-11T19:00:00Z', 300), // 00:30 on the 12th in IST
      show('2026-11-18T14:00:00Z', 300), show('2026-11-19T14:00:00Z', 300),
    ])
    expect(stageStreak(run, '2026-11-20')).toEqual({ current: 2, longest: 3 })
    expect(stageStreak(run, '2026-11-21')).toEqual({ current: 0, longest: 3 })
    expect(stageStreak(new Map(), '2026-11-21')).toEqual({ current: 0, longest: 0 })
  })
})
