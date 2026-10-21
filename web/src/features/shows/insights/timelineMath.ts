/** Your shows over time: a calendar of mics, shows per month, and a rolling rating. All IST. */
import type { PerformanceLog } from '../../../api/types'
import { toIstInput } from '../../../lib/time'
import { weightedRating } from '../logStats'

const istDate = (iso: string): string => toIstInput(iso).slice(0, 10)
const byDate = (a: PerformanceLog, b: PerformanceLog) => a.performed_at.localeCompare(b.performed_at)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export interface Month {
  key: string // YYYY-MM
  label: string
  /** How many shows got each rating: index 0 is 1 star, index 4 is 5 stars. */
  byRating: number[]
  shows: number
  seconds: number
}

/** Every month from your first show to your last, empty months included so gaps show. */
export function months(logs: PerformanceLog[]): Month[] {
  if (!logs.length) return []
  const keys = logs.map((l) => istDate(l.performed_at).slice(0, 7)).sort()
  const out: Month[] = []
  let [y, m] = keys[0].split('-').map(Number)
  const last = keys[keys.length - 1]
  for (;;) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    const shows = logs.filter((l) => istDate(l.performed_at).startsWith(key))
    const byRating = [1, 2, 3, 4, 5].map((r) => shows.filter((l) => l.rating === r).length)
    out.push({ key, label: `${MONTHS[m - 1]} ${String(y).slice(2)}`, byRating, shows: shows.length, seconds: shows.reduce((s, l) => s + l.duration_seconds, 0) })
    if (key >= last) return out
    ;[y, m] = m === 12 ? [y + 1, 1] : [y, m + 1]
  }
}

export interface CalendarYear {
  year: number
  /** Columns of seven days, Monday first. Null where the week runs into another year. */
  weeks: (string | null)[][]
}

/** Shows by IST date. */
export function showsByDay(logs: PerformanceLog[]): Map<string, PerformanceLog[]> {
  const days = new Map<string, PerformanceLog[]>()
  for (const l of [...logs].sort(byDate)) days.set(istDate(l.performed_at), [...(days.get(istDate(l.performed_at)) ?? []), l])
  return days
}

/** One calendar per year you performed in, newest first. */
export function calendarYears(logs: PerformanceLog[]): CalendarYear[] {
  const years = [...new Set(logs.map((l) => Number(istDate(l.performed_at).slice(0, 4))))].sort((a, b) => b - a)
  return years.map((year) => {
    const day = new Date(Date.UTC(year, 0, 1))
    day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7)) // back to Monday
    const weeks: (string | null)[][] = []
    while (day.getUTCFullYear() <= year) {
      const week = Array.from({ length: 7 }, () => {
        const iso = day.toISOString().slice(0, 10)
        day.setUTCDate(day.getUTCDate() + 1)
        return iso.startsWith(String(year)) ? iso : null
      })
      weeks.push(week)
    }
    return { year, weeks }
  })
}

export interface TrendPoint {
  at: string
  rating: number
}

/**
 * Your rating over your last `window` shows, after every show. It starts once there are five
 * shows to average, so the first few don't swing it.
 */
export function trend(logs: PerformanceLog[], window = 10): TrendPoint[] {
  const sorted = [...logs].sort(byDate)
  return sorted.flatMap((l, i) => (i < 4 ? [] : [{ at: l.performed_at, rating: weightedRating(sorted.slice(Math.max(0, i + 1 - window), i + 1)) ?? 0 }]))
}
