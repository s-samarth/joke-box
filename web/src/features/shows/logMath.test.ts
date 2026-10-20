import { describe, expect, it } from 'vitest'
import type { PerformanceLog } from '../../api/types'
import { NO_FILTERS, applyFilters, periodStart, sortLogs } from './logMath'
import { medianAudience, totals, weightedRating } from './logStats'

const log = (over: Partial<PerformanceLog>): PerformanceLog => ({
  id: crypto.randomUUID(), venue_name: 'Garage', performed_at: '2026-10-01T15:00:00Z', duration_seconds: 300,
  audience_size: 10, rating: 3, topic_ids: [], notes: '', created_at: '2026-10-01T15:00:00Z', ...over,
})

const TODAY = '2026-10-20' // a Tuesday

describe('performance stats', () => {
  it('weights rating by set length', () => {
    const logs = [log({ rating: 5, duration_seconds: 1200 }), log({ rating: 1, duration_seconds: 300 })]
    expect(weightedRating(logs)).toBeCloseTo(4.2)
    expect(weightedRating([])).toBeNull()
  })

  it('takes the median crowd, skipping shows with no count', () => {
    const sizes = (...n: number[]) => n.map((audience_size) => log({ audience_size }))
    expect(medianAudience(sizes(10, 200, 30, 0))).toBe(30)
    expect(medianAudience(sizes(10, 20, 30, 40))).toBe(25)
    expect(medianAudience(sizes(0))).toBeNull()
  })

  it('totals', () => {
    expect(totals([log({}), log({ venue_name: 'Street Mic' })])).toMatchObject({ shows: 2, stageSeconds: 600, audience: 10 })
  })
})

describe('periods', () => {
  it('starts months on the 1st and weeks on Monday', () => {
    expect(periodStart('month', TODAY)).toBe('2026-10-01')
    expect(periodStart('week', TODAY)).toBe('2026-10-19')
    expect(periodStart('week', '2026-10-25')).toBe('2026-10-19') // Sunday belongs to the week before
    expect(periodStart('all', TODAY)).toBe('')
  })

  it('filters by period in IST', () => {
    const logs = [
      log({ performed_at: '2026-09-30T12:00:00Z' }),
      log({ performed_at: '2026-10-05T12:00:00Z' }),
      // 19:00 UTC on the 18th is 00:30 IST on Monday the 19th.
      log({ performed_at: '2026-10-18T19:00:00Z' }),
    ]
    expect(applyFilters(logs, { ...NO_FILTERS, period: 'month' }, TODAY)).toHaveLength(2)
    expect(applyFilters(logs, { ...NO_FILTERS, period: 'week' }, TODAY)).toHaveLength(1)
    expect(applyFilters(logs, NO_FILTERS, TODAY)).toHaveLength(3)
  })
})

describe('filters', () => {
  const logs = [
    log({ duration_seconds: 299, audience_size: 4 }),
    log({ duration_seconds: 300, audience_size: 5, venue_name: 'Street Mic' }),
    log({ duration_seconds: 3600, audience_size: 101, rating: 5, performed_at: '2026-10-05T19:00:00Z' }),
  ]

  it('respects band edges', () => {
    expect(applyFilters(logs, { ...NO_FILTERS, duration: '< 5 min' }, TODAY)).toHaveLength(1)
    expect(applyFilters(logs, { ...NO_FILTERS, duration: '5–10 min' }, TODAY)).toHaveLength(1)
    expect(applyFilters(logs, { ...NO_FILTERS, audience: '100+' }, TODAY)).toHaveLength(1)
    expect(applyFilters(logs, { ...NO_FILTERS, audience: '5–10' }, TODAY)).toHaveLength(1)
  })

  it('filters by venue, rating and IST date', () => {
    expect(applyFilters(logs, { ...NO_FILTERS, venues: ['Street Mic'] }, TODAY)).toHaveLength(1)
    expect(applyFilters(logs, { ...NO_FILTERS, rating: 5 }, TODAY)).toHaveLength(1)
    // 19:00 UTC on the 5th is 00:30 IST on the 6th.
    expect(applyFilters(logs, { ...NO_FILTERS, from: '2026-10-06' }, TODAY)).toHaveLength(1)
  })

  it('sorts by any column, both ways', () => {
    expect(sortLogs(logs, { key: 'duration', desc: true })[0].duration_seconds).toBe(3600)
    expect(sortLogs(logs, { key: 'duration', desc: false })[0].duration_seconds).toBe(299)
    expect(sortLogs(logs, { key: 'venue', desc: false })[0].venue_name).toBe('Garage')
  })
})
