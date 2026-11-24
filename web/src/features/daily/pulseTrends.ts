/**
 * The pulse over time. Month on month: the last six calendar months, each counted on what was
 * written that month (how much, and how much of it has gone on since). JokeBox keeps no history of
 * statuses, so a month can only be judged by where its writing stands today: recent months look
 * worse until their ideas have had time, and are marked as still settling. When you write: the
 * last 90 days by weekday and part of the day.
 * The same rules as app/connector/pulse_trends.py: change them together.
 */
import type { Premise } from '../../api/premises'
import type { Joke, Observation } from '../../api/types'
import { toIstInput } from '../../lib/time'
import { daysBetween, shiftMonth } from './dailyMath'
import { stepsOf, within, type PulseInput, type Step } from './pulse'

export const MONTHS = 6
/** A month that ended fewer than this many days ago is still settling. */
export const SETTLE = 30
/** When you write is read from the last 90 days, once there are this many pieces. */
const RHYTHM_DAYS = 90
const ENOUGH = 10

export interface MonthRow {
  /** YYYY-MM. */
  month: string
  written: number
  steps: Step[]
  settling: boolean
}

export const PARTS = ['Morning', 'Afternoon', 'Evening', 'Night'] as const
export const WEEKDAYS = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'] as const

export interface Rhythm {
  /** Pieces by weekday (Monday first) and part of the day (morning first). */
  grid: number[][]
  total: number
  busiest: { day: string; part: string; count: number }
}

const monthOf = (iso: string) => toIstInput(iso).slice(0, 7)

/** The last day of a YYYY-MM month. */
const monthEnd = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).toISOString().slice(0, 10)

export function monthOnMonth(input: PulseInput, built: Set<string>): MonthRow[] {
  const current = input.today.slice(0, 7)
  return Array.from({ length: MONTHS }, (_, i) => shiftMonth(current, i - MONTHS + 1)).map((month) => {
    const pick = <T extends { created_at: string }>(items: T[]) => items.filter((x) => monthOf(x.created_at) === month)
    const [o, p, j] = [pick<Observation>(input.observations), pick<Premise>(input.premises), pick<Joke>(input.jokes)]
    return { month, written: o.length + p.length + j.length, steps: stepsOf(input, built, o, p, j), settling: daysBetween(monthEnd(month), input.today) < SETTLE }
  })
}

/** 0 morning (5 to noon), 1 afternoon (to 5), 2 evening (to 10), 3 night. */
export function partIndex(hour: number): number {
  if (hour >= 5 && hour < 12) return 0
  if (hour >= 12 && hour < 17) return 1
  if (hour >= 17 && hour < 22) return 2
  return 3
}

export function rhythm({ jokes, premises, observations, today }: PulseInput): Rhythm | null {
  const when = [...within(jokes, today, 0, RHYTHM_DAYS), ...within(premises, today, 0, RHYTHM_DAYS), ...within(observations, today, 0, RHYTHM_DAYS)].map((i) => toIstInput(i.created_at))
  if (when.length < ENOUGH) return null
  const grid = WEEKDAYS.map(() => PARTS.map(() => 0))
  for (const local of when) {
    const weekday = (new Date(`${local.slice(0, 10)}T12:00:00Z`).getUTCDay() + 6) % 7
    grid[weekday][partIndex(Number(local.slice(11, 13)))]++
  }
  // The busiest cell; the first in the week (then the earliest in the day) wins a tie.
  let busiest = { day: WEEKDAYS[0] as string, part: PARTS[0] as string, count: -1 }
  grid.forEach((row, d) => row.forEach((n, p) => { if (n > busiest.count) busiest = { day: WEEKDAYS[d], part: PARTS[p], count: n } }))
  return { grid, total: when.length, busiest }
}
