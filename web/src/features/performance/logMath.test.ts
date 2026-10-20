import { describe, expect, it } from 'vitest'
import type { PerformanceLog } from '../../api/types'
import { NO_FILTERS, applyFilters, sortLogs, stats, weightedRating } from './logMath'

const log = (over: Partial<PerformanceLog>): PerformanceLog => ({
  id: crypto.randomUUID(), venue_name: 'Garage', performed_at: '2026-10-01T15:00:00Z', duration_seconds: 300,
  audience_size: 10, rating: 3, topic_ids: [], notes: '', created_at: '2026-10-01T15:00:00Z', ...over,
})

describe('performance stats', () => {
  it('weights rating by set length', () => {
    const logs = [log({ rating: 5, duration_seconds: 1200 }), log({ rating: 1, duration_seconds: 300 })]
    expect(weightedRating(logs)).toBeCloseTo(4.2)
    expect(weightedRating([])).toBeNull()
  })

  it('totals and top venue', () => {
    const s = stats([log({}), log({ venue_name: 'Street Mic' }), log({ venue_name: 'Street Mic' })])
    expect(s).toMatchObject({ totalSets: 3, stageSeconds: 900, topVenue: 'Street Mic' })
  })
})

describe('filters', () => {
  const logs = [
    log({ duration_seconds: 299, audience_size: 4 }),
    log({ duration_seconds: 300, audience_size: 5, venue_name: 'Street Mic' }),
    log({ duration_seconds: 3600, audience_size: 101, rating: 5, performed_at: '2026-10-05T19:00:00Z' }),
  ]

  it('respects band edges', () => {
    expect(applyFilters(logs, { ...NO_FILTERS, duration: '< 5 min' })).toHaveLength(1)
    expect(applyFilters(logs, { ...NO_FILTERS, duration: '5–10 min' })).toHaveLength(1)
    expect(applyFilters(logs, { ...NO_FILTERS, audience: '100+' })).toHaveLength(1)
    expect(applyFilters(logs, { ...NO_FILTERS, audience: '5–10' })).toHaveLength(1)
  })

  it('filters by venue, rating and IST date', () => {
    expect(applyFilters(logs, { ...NO_FILTERS, venues: ['Street Mic'] })).toHaveLength(1)
    expect(applyFilters(logs, { ...NO_FILTERS, rating: 5 })).toHaveLength(1)
    // 19:00 UTC on the 5th is 00:30 IST on the 6th.
    expect(applyFilters(logs, { ...NO_FILTERS, from: '2026-10-06' })).toHaveLength(1)
  })

  it('sorts', () => {
    expect(sortLogs(logs, 'duration', true)[0].duration_seconds).toBe(3600)
  })
})
