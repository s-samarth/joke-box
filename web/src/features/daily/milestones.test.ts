import { describe, expect, it } from 'vitest'
import { dueMilestone, milestoneFor, milestoneMessage, streakStart } from './milestones'

describe('streak milestones', () => {
  it('steps through a week, the months, half a year, then every year', () => {
    expect([6, 7, 29, 30, 59, 60, 90, 179, 180, 364, 365, 729, 730, 1100].map(milestoneFor))
      .toEqual([null, 7, 7, 30, 30, 60, 90, 90, 180, 180, 365, 365, 730, 1095])
  })

  it('finds the first day of the streak, ending today or yesterday', () => {
    expect(streakStart({ current: 7, gap: 0 }, '2026-11-22')).toBe('2026-11-16')
    expect(streakStart({ current: 7, gap: 1 }, '2026-11-22')).toBe('2026-11-15')
    expect(streakStart({ current: 0, gap: 3 }, '2026-11-22')).toBeNull()
  })

  it('celebrates each milestone once per streak, and again on a new streak', () => {
    expect(dueMilestone(7, '2026-11-16', null)).toBe(7)
    expect(dueMilestone(8, '2026-11-16', { start: '2026-11-16', milestone: 7 })).toBeNull()
    expect(dueMilestone(30, '2026-11-16', { start: '2026-11-16', milestone: 7 })).toBe(30)
    expect(dueMilestone(7, '2026-12-20', { start: '2026-11-16', milestone: 30 })).toBe(7)
    // Opened the app on day 40 for the first time: the 30 still gets its moment.
    expect(dueMilestone(40, '2026-10-14', null)).toBe(30)
    expect(dueMilestone(5, '2026-11-18', null)).toBeNull()
  })

  it('says it in words', () => {
    expect(milestoneMessage('joke', 7)).toBe('7-day joke streak. A week of jokes!')
    expect(milestoneMessage('stage', 30)).toBe('30-day stage streak. A month of mics!')
    expect(milestoneMessage('stage', 365)).toBe('1-year stage streak. A whole year of mics!')
    expect(milestoneMessage('joke', 730)).toBe('2-year joke streak. 2 years straight!')
  })
})
