/**
 * The show calendar's numbers: a month's shows, minutes on stage and mic days, and how deep a
 * day's gold is. Days are IST dates, the same as the mic diary (showsByDay in timelineMath).
 */
import type { PerformanceLog } from '../../../api/types'
import { habit } from '../../daily/dailyMath'

export type ShowDays = Map<string, PerformanceLog[]>

export interface MonthStats {
  shows: number
  seconds: number
  /** Days you went up at least once. */
  days: number
}

/** A YYYY-MM month's shows, time on stage and mic days. */
export function monthStats(days: ShowDays, month: string): MonthStats {
  const stats: MonthStats = { shows: 0, seconds: 0, days: 0 }
  for (const [day, shows] of days) {
    if (!day.startsWith(month)) continue
    stats.days += 1
    stats.shows += shows.length
    stats.seconds += secondsOf(shows)
  }
  return stats
}

export const secondsOf = (shows: PerformanceLog[]): number => shows.reduce((s, l) => s + l.duration_seconds, 0)

/** Whole minutes for a day's box: "17m". Any time on stage under a minute still reads as 1m. */
export function dayMinutes(seconds: number): string {
  return `${seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : 0}m`
}

/** A month's time on stage: "45 min", or "1h 32m" from an hour up. */
export function stageTotal(seconds: number): string {
  const m = Math.round(seconds / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}

/** How deep a day's gold is, 1 to 4, by minutes on stage: up to 5, 10, 20, then more. */
export function stageHeat(seconds: number): 1 | 2 | 3 | 4 {
  const m = seconds / 60
  if (m <= 5) return 1
  if (m <= 10) return 2
  if (m <= 20) return 3
  return 4
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** "10 shows · 1h 32m on stage · up on 8 days", or "No shows" for an empty month. */
export function monthLine({ shows, seconds, days }: MonthStats): string {
  if (!shows) return 'No shows'
  return `${plural(shows, 'show')} · ${stageTotal(seconds)} on stage · up on ${plural(days, 'day')}`
}

/**
 * Days in a row with at least one show, by the joke streak's rules: it ends today, or yesterday
 * while today is still open. `longest` is the best run ever.
 */
export function stageStreak(days: ShowDays, today: string): { current: number; longest: number } {
  const { current, longest } = habit(days.keys(), today)
  return { current, longest }
}
