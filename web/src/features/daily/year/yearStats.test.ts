// Made-up material only.
import { describe, expect, it } from 'vitest'
import type { Premise } from '../../../api/premises'
import type { Joke, Observation, PerformanceLog } from '../../../api/types'
import { showsByDay } from '../../shows/insights/timelineMath'
import { activityByDay } from '../activity'
import { storiesFor } from './storyCards'
import { themeFor } from './themes'
import { activeYears, yearStats } from './yearStats'

const TODAY = '2026-11-24'
/** 11 pm in India on `day`. */
const late = (day: string) => `${day}T17:30:00Z`
let n = 0
const joke = (day: string, extra: Partial<Joke> = {}) => ({ id: `j${++n}`, setup: 'Made-up', punchline: '', status: 'Draft', topic_id: 't1', premise_id: null, created_at: late(day), updated_at: late(day), ...extra }) as Joke
const premise = (day: string, id: string) => ({ id, take: 'Made-up take', notes: '', topic_id: 't1', strength: null, status: 'Draft', version: 1, created_at: late(day), updated_at: late(day) }) as Premise
const obs = (day: string, used = false) => ({ id: `o${++n}`, text: 'Made-up', topic_id: null, premise_ids: used ? ['p1'] : [], joke_ids: [], created_at: late(day), updated_at: late(day) }) as unknown as Observation
const show = (day: string, minutes: number, rating = 3) => ({ id: `s${++n}`, venue_name: 'Made-up Mic', performed_at: `${day}T15:00:00Z`, duration_seconds: minutes * 60, rating, laughs: null }) as unknown as PerformanceLog

const jokes = [joke('2026-08-01', { status: 'Stage Ready', premise_id: 'p1' }), joke('2026-08-02'), joke('2026-08-03'), joke('2025-05-05')]
const premises = [premise('2026-08-02', 'p1'), premise('2026-02-02', 'p2')]
const observations = [obs('2026-08-02', true), obs('2026-01-09')]
const activity = activityByDay(jokes, premises, observations)
const stage = showsByDay([show('2026-10-03', 12, 5), show('2026-10-03', 6), show('2026-09-01', 10, 2)])
const context = {
  activity, stage, today: TODAY, built: new Set(['p1']),
  used: (o: Observation) => o.premise_ids.length > 0,
  topicName: (id: string | null) => (id === 't1' ? 'Trains' : 'Random'),
}

describe('year review', () => {
  it('lists years with anything in them, newest first', () => {
    expect(activeYears(activity, stage, TODAY)).toEqual([2026, 2025])
  })

  it('sums this year so far', () => {
    const s = yearStats(2026, context)
    expect([s.sofar, s.to, s.daysCounted, s.daysIn]).toEqual([true, TODAY, 328, 365])
    expect([s.total, s.lastYearTotal]).toEqual([7, 1])
    expect(s.counts).toEqual({ observations: 2, premises: 2, jokes: 3 })
    expect(s.best).toMatchObject({ month: '2026-08', total: 5, jokes: 3, daysWritten: 3, days: 31 })
    expect(s.months[10].days).toBe(24) // November so far
    expect(s.streak).toEqual({ length: 3, from: '2026-08-01', to: '2026-08-03' })
    expect(s.topics).toEqual([{ name: 'Trains', count: 5 }, { name: 'Random', count: 2 }])
    expect(s.rhythm?.part).toBe('Night')
    expect(s.stage).toMatchObject({ seconds: 28 * 60, shows: 3, nights: 2, well: 1, top: 5, atTop: 1, busiest: { month: '2026-10', shows: 2 }, longest: 720 })
    expect(s.dayTotals.get('2026-08-02')).toBe(3)
    expect(s.through).toEqual({ led: 1, observations: 2, built: 1, premises: 2, ready: 1, jokes: 3 })
  })

  it('wraps a past year to 31 December and leaves out cards with nothing to say', () => {
    const s = yearStats(2025, context)
    expect([s.sofar, s.to, s.stage, s.lastYearTotal]).toEqual([false, '2025-12-31', null, null])
    expect(storiesFor(s, themeFor(2025)).map((c) => c.key)).toEqual(['cover', 'month', 'day', 'topic', 'when', 'through'])
    expect(storiesFor(yearStats(2026, context), themeFor(2026)).map((c) => c.key)).toEqual(['cover', 'month', 'day', 'streak', 'topic', 'when', 'stage', 'through'])
  })

  it('gives each year its look in turn: wall, flyer, marquee, then round again', () => {
    expect([2026, 2025, 2024, 2023, 2027].map((y) => themeFor(y).key)).toEqual(['wall', 'flyer', 'marquee', 'wall', 'marquee'])
  })
})
