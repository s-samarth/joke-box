/**
 * How your shows were rated, for Big days and the year review: how many you rated well (4 stars
 * and up), your highest rating and how many shows got it, and the latest of those.
 */
import type { PerformanceLog } from '../../../api/types'
import { toIstInput } from '../../../lib/time'

export const WELL = 4

export interface Ratings {
  /** Shows rated 4 stars or more. */
  well: number
  /** The highest rating you've given, and how many shows have it. */
  top: number
  atTop: number
  /** The IST day of the latest show at the top rating. */
  latest: string
}

export function ratingsOf(logs: PerformanceLog[]): Ratings | null {
  if (!logs.length) return null
  const top = Math.max(...logs.map((l) => l.rating))
  const best = logs.filter((l) => l.rating === top).map((l) => toIstInput(l.performed_at).slice(0, 10)).sort()
  return { well: logs.filter((l) => l.rating >= WELL).length, top, atTop: best.length, latest: best[best.length - 1] }
}

/** "★★★★★" for a rating. */
export const stars = (n: number) => '★'.repeat(n)
