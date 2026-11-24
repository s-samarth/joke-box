/**
 * A year in numbers, for the year review (like Spotify Wrapped): what you wrote and when, your
 * best month and day, your longest streak and top topic, your year on stage, and how far the
 * year's ideas got. Shows are counted by how you rated them, not by laughs. The current year is "so far" (1 January to today); the full wrap is for a
 * year that's over. Days are IST dates.
 */
import type { Observation } from '../../../api/types'
import { secondsOf, type ShowDays } from '../../shows/calendar/showMonth'
import { countsOf, totalOf, type Activity, type Counts } from '../activity'
import { daysBetween } from '../dailyMath'
import { longestRun, type Run } from '../highlights/highlightMath'
import { ratingsOf } from '../highlights/ratings'
import { isStageReady } from '../pulse'
import { partIndex, PARTS, WEEKDAYS } from '../pulseTrends'

export interface YearMonth {
  month: string
  total: number
  jokes: number
  counts: Counts
  /** Days anything was written, and days in the month (so far, for this one). */
  daysWritten: number
  days: number
}

export interface YearStats {
  year: number
  sofar: boolean
  /** The last day counted: today for this year, 31 December for one that's over. */
  to: string
  daysIn: number
  daysCounted: number
  counts: Counts
  total: number
  lastYearTotal: number | null
  months: YearMonth[]
  best: YearMonth | null
  biggest: { day: string; counts: Counts; total: number } | null
  streak: Run | null
  /** What was written each day of the year, for the biggest day's month. */
  dayTotals: Map<string, number>
  /** Days with a new joke this year, for the streak's year grid. */
  jokeDays: Set<string>
  /** The topics most written on, most first (at most 6). */
  topics: { name: string; count: number }[]
  rhythm: { day: string; part: string; count: number; grid: number[][] } | null
  stage: { seconds: number; shows: number; nights: number; well: number; top: number; atTop: number; busiest: { month: string; shows: number } | null; longest: number } | null
  through: { led: number; observations: number; built: number; premises: number; ready: number; jokes: number }
}

const inYear = (year: number) => (day: string) => day.startsWith(`${year}-`)
const ZERO: Counts = { observations: 0, premises: 0, jokes: 0 }

/** Years with anything written or a show, newest first. */
export function activeYears(activity: Activity, stage: ShowDays, today: string): number[] {
  const years = new Set([...activity.keys(), ...stage.keys()].filter((d) => d <= today).map((d) => Number(d.slice(0, 4))))
  years.add(Number(today.slice(0, 4)))
  return [...years].sort((a, b) => b - a)
}

const yearTotal = (activity: Activity, year: number) => [...activity].filter(([d]) => inYear(year)(d)).reduce((s, [, a]) => s + totalOf(countsOf(a)), 0)

interface Context {
  activity: Activity
  stage: ShowDays
  used: (o: Observation) => boolean
  /** Every premise id some joke rests on. */
  built: Set<string>
  topicName: (id: string | null) => string
  today: string
}

export function yearStats(year: number, { activity, stage, used, built, topicName, today }: Context): YearStats {
  const sofar = Number(today.slice(0, 4)) === year
  const to = sofar ? today : `${year}-12-31`
  const days = [...activity].filter(([d]) => inYear(year)(d) && d <= to).sort((a, b) => a[0].localeCompare(b[0]))
  const counts = days.reduce<Counts>((c, [, a]) => { const x = countsOf(a); return { observations: c.observations + x.observations, premises: c.premises + x.premises, jokes: c.jokes + x.jokes } }, ZERO)
  const months: YearMonth[] = Array.from({ length: 12 }, (_, m) => {
    const month = `${year}-${String(m + 1).padStart(2, '0')}`
    const these = days.filter(([d]) => d.startsWith(month))
    const length = new Date(Date.UTC(year, m + 1, 0)).getUTCDate()
    const counted = month > to.slice(0, 7) ? 0 : month === to.slice(0, 7) ? Number(to.slice(8)) : length
    const c = these.reduce<Counts>((x, [, a]) => { const y = countsOf(a); return { observations: x.observations + y.observations, premises: x.premises + y.premises, jokes: x.jokes + y.jokes } }, ZERO)
    return { month, total: totalOf(c), jokes: c.jokes, counts: c, daysWritten: these.filter(([, a]) => totalOf(countsOf(a))).length, days: counted }
  })
  const best = months.reduce<YearMonth | null>((b, m) => (m.total > (b?.total ?? 0) ? m : b), null)
  const biggest = days.reduce<YearStats['biggest']>((b, [day, a]) => { const c = countsOf(a); return totalOf(c) > (b?.total ?? 0) ? { day, counts: c, total: totalOf(c) } : b }, null)

  const items = days.flatMap(([, a]) => [...a.jokes, ...a.premises, ...a.observations])
  const byTopic = new Map<string | null, number>()
  for (const i of items) byTopic.set(i.topic_id ?? null, (byTopic.get(i.topic_id ?? null) ?? 0) + 1)
  const topics = [...byTopic].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, count]) => ({ name: topicName(id), count }))
  const grid = WEEKDAYS.map(() => PARTS.map(() => 0))
  for (const i of items) {
    const local = new Date(new Date(i.created_at).getTime() + 5.5 * 3600_000)
    grid[(local.getUTCDay() + 6) % 7][partIndex(local.getUTCHours())]++
  }
  // The busiest cell; the first in the week (then the earliest in the day) wins a tie.
  let busy: { d: number; p: number; n: number } | null = null
  grid.forEach((row, d) => row.forEach((n, p) => { if (n > (busy?.n ?? 0)) busy = { d, p, n } }))
  const when = busy as { d: number; p: number; n: number } | null

  const nights = [...stage].filter(([d]) => inYear(year)(d) && d <= to)
  const shows = nights.flatMap(([, s]) => s)
  const rated = ratingsOf(shows)
  const perMonth = new Map<string, number>()
  for (const [d, s] of nights) perMonth.set(d.slice(0, 7), (perMonth.get(d.slice(0, 7)) ?? 0) + s.length)
  const busiest = [...perMonth].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]

  const all = { o: days.flatMap(([, a]) => a.observations), p: days.flatMap(([, a]) => a.premises), j: days.flatMap(([, a]) => a.jokes) }
  const last = yearTotal(activity, year - 1)
  return {
    year, sofar, to,
    daysIn: daysBetween(`${year}-01-01`, `${year}-12-31`) + 1,
    daysCounted: daysBetween(`${year}-01-01`, to) + 1,
    counts, total: totalOf(counts),
    lastYearTotal: last || null,
    months, best, biggest,
    streak: longestRun(days.filter(([, a]) => a.jokes.length).map(([d]) => d)),
    dayTotals: new Map(days.map(([d, a]) => [d, totalOf(countsOf(a))])),
    jokeDays: new Set(days.filter(([, a]) => a.jokes.length).map(([d]) => d)),
    topics,
    rhythm: when ? { day: WEEKDAYS[when.d], part: PARTS[when.p], count: when.n, grid } : null,
    stage: shows.length && rated ? { seconds: secondsOf(shows), shows: shows.length, nights: nights.length, well: rated.well, top: rated.top, atTop: rated.atTop, busiest: busiest ? { month: busiest[0], shows: busiest[1] } : null, longest: Math.max(...shows.map((s) => s.duration_seconds)) } : null,
    through: { led: all.o.filter(used).length, observations: all.o.length, built: all.p.filter((p) => built.has(p.id)).length, premises: all.p.length, ready: all.j.filter(isStageReady).length, jokes: all.j.length },
  }
}
