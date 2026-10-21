import { describe, expect, it } from 'vitest'
import type { PerformanceLog, Topic } from '../../../api/types'
import { byLength, bySlot, byTopic, byVenue, extremes, slotOf } from './insightMath'
import { calendarYears, months, showsByDay, trend } from './timelineMath'

const log = (over: Partial<PerformanceLog>): PerformanceLog => ({
  id: crypto.randomUUID(), venue_name: 'Garage', performed_at: '2026-10-01T15:00:00Z', duration_seconds: 300,
  audience_size: 0, rating: 3, topic_ids: [], notes: '', laughs: null, created_at: '2026-10-01T15:00:00Z', ...over,
})
const topic = (id: string, name: string) => ({ id, name, is_system: false, subtopics: [] }) as Topic

describe('strengths and weak spots', () => {
  const logs = [
    ...[4, 4, 4].map((rating) => log({ rating, topic_ids: ['t1'], venue_name: 'Attic' })),
    ...[2, 2, 3].map((rating) => log({ rating, topic_ids: ['t2', 'gone'] })),
    log({ rating: 5, topic_ids: ['t1', 't2'] }),
  ]

  it('rates each topic against your overall rating, best first, and sets aside thin ones', () => {
    const b = byTopic(logs, [topic('t1', 'Travel'), topic('t2', 'Work'), topic('t3', 'Unused')])
    expect(b.ranked.map((g) => [g.label, g.shows])).toEqual([['Travel', 4], ['Work', 4]])
    expect(b.ranked[0].delta).toBeGreaterThan(0)
    expect(b.ranked[1].delta).toBeLessThan(0)
    expect(b.ranked[0].great).toBe(1)
    expect(b.few).toEqual([])
  })

  it('keeps venues with too few shows apart', () => {
    const b = byVenue([...logs, log({ venue_name: 'Once' })])
    expect(b.ranked.map((g) => g.label)).toEqual(['Attic', 'Garage'])
    expect(b.few.map((g) => g.label)).toEqual(['Once'])
  })

  it('keeps set lengths and time slots in their natural order', () => {
    const mixed = [...[100, 200, 250].map((s) => log({ duration_seconds: s })), ...[700, 800, 850].map((s) => log({ duration_seconds: s, rating: 4 }))]
    expect(byLength(mixed).ranked.map((g) => g.label)).toEqual(['< 5 min', '10–15 min'])
    expect(slotOf('2026-10-01T17:30:00Z')).toBe('late') // 11 pm IST
    expect(slotOf('2026-10-01T19:00:00Z')).toBe('late') // 12:30 am IST
    expect(slotOf('2026-10-01T14:30:00Z')).toBe('20') // 8 pm IST
    expect(bySlot([log({ performed_at: '2026-10-01T17:30:00Z' }), ...mixed]).few.map((g) => g.label)).toEqual(['11 pm or later'])
  })

  it('only calls something a strength when it clearly beats your usual', () => {
    expect(extremes(byVenue(logs)).best?.label).toBe('Attic')
    expect(extremes(byVenue([log({}), log({}), log({})]))).toEqual({ best: undefined, worst: undefined })
  })

  it('copes with no shows at all', () => {
    expect(byTopic([], [])).toEqual({ ranked: [], few: [] })
    expect(months([])).toEqual([])
    expect(calendarYears([])).toEqual([])
    expect(trend([])).toEqual([])
  })
})

describe('timeline', () => {
  it('lists every month between the first and last show, gaps included', () => {
    const m = months([log({ performed_at: '2024-11-20T15:00:00Z', rating: 4 }), log({ performed_at: '2025-01-31T19:00:00Z' })])
    expect(m.map((x) => x.label)).toEqual(['Nov 24', 'Dec 24', 'Jan 25', 'Feb 25']) // 31 Jan 19:00 UTC is 1 Feb in IST
    expect(m[0].byRating).toEqual([0, 0, 0, 1, 0])
    expect(m.map((x) => x.shows)).toEqual([1, 0, 0, 1])
  })

  it('lays a year out in Monday-first weeks', () => {
    const [y] = calendarYears([log({ performed_at: '2025-06-01T15:00:00Z' })])
    expect(y.year).toBe(2025)
    expect(y.weeks[0]).toEqual([null, null, '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05'])
    expect(y.weeks.flat().filter(Boolean)).toHaveLength(365)
    expect(showsByDay([log({ performed_at: '2025-06-01T19:00:00Z' })]).has('2025-06-02')).toBe(true)
  })

  it('rolls the rating over the last shows once there are five', () => {
    const logs = [3, 3, 3, 3, 3, 5].map((rating, i) => log({ rating, performed_at: `2026-10-0${i + 1}T15:00:00Z` }))
    const t = trend(logs, 2)
    expect(t).toHaveLength(2)
    expect(t.map((p) => p.rating)).toEqual([3, 4])
  })
})
