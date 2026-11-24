// Made-up material only.
import { describe, expect, it } from 'vitest'
import type { Premise } from '../../../api/premises'
import type { Joke, Observation, PerformanceLog } from '../../../api/types'
import { activityByDay } from '../activity'
import { showsByDay } from '../../shows/insights/timelineMath'
import { bestMonth, bigDays, lastTwelve, longestRun, monthTotals, yearGrid } from './highlightMath'

const TODAY = '2026-11-24'
const noon = (day: string) => `${day}T06:30:00Z`
let n = 0
const joke = (day: string) => ({ id: `j${++n}`, setup: 'Made-up setup', punchline: '', status: 'Draft', topic_id: 't', created_at: noon(day), updated_at: noon(day) }) as unknown as Joke
const obs = (day: string) => ({ id: `o${++n}`, text: 'Made-up note', topic_id: 't', premise_ids: [], joke_ids: [], created_at: noon(day), updated_at: noon(day) }) as unknown as Observation
const show = (day: string, minutes: number, laughs: number[] | null = null) =>
  ({ id: `s${++n}`, venue_name: 'Made-up Mic', performed_at: `${day}T15:00:00Z`, duration_seconds: minutes * 60, rating: 3, laughs }) as unknown as PerformanceLog

const jokes = [joke('2026-08-14'), joke('2026-08-14'), joke('2026-08-15'), joke('2026-08-16'), joke('2026-10-02')]
const observations = [obs('2026-08-14'), obs('2026-03-01'), obs('2026-03-02'), obs('2026-03-03')]
const logs = [show('2026-10-03', 12, [2, 1, 0, 0, 0]), show('2026-10-03', 15), show('2026-10-20', 8, [0, 0, 0, 2, 1])]
const activity = activityByDay(jokes, [] as Premise[], observations)
const stage = showsByDay(logs)

describe('highlights', () => {
  it('adds up every month from the first piece to this one', () => {
    const rows = monthTotals(activity, stage, TODAY)
    expect(rows.map((r) => r.month)).toEqual(['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'])
    expect(rows.find((r) => r.month === '2026-10')).toMatchObject({ jokes: 1, shows: 3, stage: 35 * 60 })
  })

  it('finds each best month, and none for a measure with nothing in it', () => {
    const rows = monthTotals(activity, stage, TODAY)
    expect(bestMonth(rows, 'jokes')?.month).toBe('2026-08')
    expect(bestMonth(rows, 'observations')?.month).toBe('2026-03')
    expect(bestMonth(rows, 'premises')).toBeNull()
    expect(lastTwelve(rows, TODAY).map((r) => r.month)).toEqual(Array.from({ length: 12 }, (_, i) => (i < 1 ? '2025-12' : `2026-${String(i).padStart(2, '0')}`)))
  })

  it('finds the longest run of days, the first of a tie', () => {
    expect(longestRun(['2026-08-16', '2026-08-14', '2026-08-15', '2026-10-01', '2026-10-02', '2026-10-03'])).toEqual({ length: 3, from: '2026-08-14', to: '2026-08-16' })
    expect(longestRun([])).toBeNull()
  })

  it('picks the big days', () => {
    const days = bigDays(activity, stage, logs, TODAY)
    expect(days.writing).toEqual({ day: '2026-08-14', total: 3, kinds: ['observations', 'jokes'] })
    expect(days.jokes).toEqual({ day: '2026-08-14', jokes: 2 })
    expect(days.stage).toEqual({ day: '2026-10-03', shows: 2, seconds: 27 * 60 })
    expect(days.rated).toEqual({ well: 0, top: 3, atTop: 3, latest: '2026-10-20', night: expect.objectContaining({ day: expect.any(String) }) })
    expect(days.streak).toEqual({ length: 3, from: '2026-08-14', to: '2026-08-16' })
  })

  it('lays the last 53 weeks out Monday first, with the three biggest days', () => {
    const { weeks, top } = yearGrid(activity, TODAY)
    expect(weeks).toHaveLength(53)
    expect(weeks[52][0].day).toBe('2026-11-23') // this week's Monday
    expect(weeks[52][2].future).toBe(true)
    expect([...top].sort()).toEqual(['2026-03-01', '2026-03-02', '2026-08-14'])
  })
})
