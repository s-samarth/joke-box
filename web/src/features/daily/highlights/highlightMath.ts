/**
 * Highlights: your best months and days, worked out from the same day-by-day activity as the
 * calendar plus your logged shows. Records are all-time; the chart shows the last 12 months.
 * Days are IST dates. Ties go to the earliest, so a record only moves when it's beaten.
 */
import type { PerformanceLog } from '../../../api/types'
import { toIstInput } from '../../../lib/time'
import { secondsOf, type ShowDays } from '../../shows/calendar/showMonth'
import { countsOf, totalOf, type Activity } from '../activity'
import { daysBetween, shiftDay, shiftMonth } from '../dailyMath'
import { ratingsOf, type Ratings } from './ratings'

export type Measure = 'jokes' | 'observations' | 'premises' | 'all' | 'shows' | 'stage'

export interface MonthTotals extends Record<Measure, number> {
  /** YYYY-MM. */
  month: string
}

const blank = (month: string): MonthTotals => ({ month, jokes: 0, observations: 0, premises: 0, all: 0, shows: 0, stage: 0 })

/** Every month from your first piece or show to this one, added up. `stage` is in seconds. */
export function monthTotals(activity: Activity, stage: ShowDays, today: string): MonthTotals[] {
  const days = [...activity.keys(), ...stage.keys()].filter((d) => d <= today).sort()
  if (!days.length) return []
  const rows = new Map<string, MonthTotals>()
  for (let m = days[0].slice(0, 7); m <= today.slice(0, 7); m = shiftMonth(m, 1)) rows.set(m, blank(m))
  for (const [day, d] of activity) {
    const row = rows.get(day.slice(0, 7))
    if (!row || day > today) continue
    const c = countsOf(d)
    row.jokes += c.jokes
    row.observations += c.observations
    row.premises += c.premises
    row.all += totalOf(c)
  }
  for (const [day, shows] of stage) {
    const row = rows.get(day.slice(0, 7))
    if (!row || day > today) continue
    row.shows += shows.length
    row.stage += secondsOf(shows)
  }
  return [...rows.values()]
}

/** The month with the most of a measure, or null when there's none of it. */
export function bestMonth(rows: MonthTotals[], key: Measure): MonthTotals | null {
  return rows.reduce<MonthTotals | null>((best, r) => (r[key] > (best?.[key] ?? 0) ? r : best), null)
}

/** The 12 months ending this one, oldest first, empty months included. */
export function lastTwelve(rows: MonthTotals[], today: string): MonthTotals[] {
  const byMonth = new Map(rows.map((r) => [r.month, r]))
  return Array.from({ length: 12 }, (_, i) => shiftMonth(today.slice(0, 7), i - 11)).map((m) => byMonth.get(m) ?? blank(m))
}

export interface Run {
  length: number
  from: string
  to: string
}

/** The longest run of days in a row (the first, if two tie). */
export function longestRun(days: Iterable<string>): Run | null {
  const sorted = [...new Set(days)].sort()
  let best: Run | null = null
  let from = sorted[0]
  sorted.forEach((d, i) => {
    if (i > 0 && daysBetween(sorted[i - 1], d) !== 1) from = d
    const length = daysBetween(from, d) + 1
    if (!best || length > best.length) best = { length, from, to: d }
  })
  return best
}

/** The day with the most of something, earliest on a tie. */
function topDay<T>(entries: Iterable<[string, T]>, score: (t: T) => number): { day: string; value: T; score: number } | null {
  let top: { day: string; value: T; score: number } | null = null
  for (const [day, value] of [...entries].sort((a, b) => a[0].localeCompare(b[0]))) {
    const s = score(value)
    if (s > 0 && (!top || s > top.score)) top = { day, value, score: s }
  }
  return top
}

export interface BigDays {
  writing: { day: string; total: number; kinds: ('observations' | 'premises' | 'jokes')[] } | null
  jokes: { day: string; jokes: number } | null
  stage: { day: string; shows: number; seconds: number } | null
  busiest: { day: string; shows: number } | null
  rated: Ratings | null
  streak: Run | null
}

export function bigDays(activity: Activity, stage: ShowDays, logs: PerformanceLog[], today: string): BigDays {
  const past = [...activity].filter(([d]) => d <= today)
  const writing = topDay(past, (d) => totalOf(countsOf(d)))
  const jokes = topDay(past, (d) => d.jokes.length)
  const night = topDay(stage, secondsOf)
  const busiest = topDay(stage, (v) => v.length)
  const counts = writing && countsOf(writing.value)
  return {
    writing: writing && counts ? { day: writing.day, total: writing.score, kinds: (['observations', 'premises', 'jokes'] as const).filter((k) => counts[k]) } : null,
    jokes: jokes && { day: jokes.day, jokes: jokes.score },
    stage: night && { day: night.day, shows: night.value.length, seconds: night.score },
    busiest: busiest && { day: busiest.day, shows: busiest.score },
    rated: ratingsOf(logs.filter((l) => toIstInput(l.performed_at).slice(0, 10) <= today)),
    streak: longestRun(past.filter(([, d]) => d.jokes.length).map(([day]) => day)),
  }
}

export interface GridCell {
  day: string
  total: number
  future: boolean
}

/** The last 53 weeks, Monday first, a column a week: how much was written each day. */
export function yearGrid(activity: Activity, today: string): { weeks: GridCell[][]; top: Set<string> } {
  const monday = shiftDay(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7))
  const start = shiftDay(monday, -52 * 7)
  const weeks = Array.from({ length: 53 }, (_, w) => Array.from({ length: 7 }, (_, d) => {
    const day = shiftDay(start, w * 7 + d)
    const a = activity.get(day)
    return { day, total: a && day <= today ? totalOf(countsOf(a)) : 0, future: day > today }
  }))
  const top = weeks.flat().filter((c) => c.total > 0).sort((a, b) => b.total - a.total || a.day.localeCompare(b.day)).slice(0, 3)
  return { weeks, top: new Set(top.map((c) => c.day)) }
}

/** Every month added up: the all-time count for each measure. */
export function lifetime(rows: MonthTotals[]): Record<Measure, number> {
  const keys: Measure[] = ['jokes', 'observations', 'premises', 'all', 'shows', 'stage']
  return Object.fromEntries(keys.map((k) => [k, rows.reduce((n, r) => n + r[k], 0)])) as Record<Measure, number>
}
