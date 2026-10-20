/** Totals for a list of shows. They always follow the current filters. */
import type { PerformanceLog } from '../../api/types'

export interface Totals {
  shows: number
  stageSeconds: number
  rating: number | null
  audience: number | null
}

/** Rating weighted by stage time: a 20-minute set counts more than a 3-minute one. */
export function weightedRating(logs: PerformanceLog[]): number | null {
  const time = logs.reduce((s, l) => s + l.duration_seconds, 0)
  if (!time) return logs.length ? logs.reduce((s, l) => s + l.rating, 0) / logs.length : null
  return logs.reduce((s, l) => s + l.rating * l.duration_seconds, 0) / time
}

/**
 * Median crowd, skipping shows logged with 0 (crowd not noted). The median isn't pulled up by one
 * packed showcase the way an average is, so it says what a typical room looks like.
 */
export function medianAudience(logs: PerformanceLog[]): number | null {
  const sizes = logs.map((l) => l.audience_size).filter((n) => n > 0).sort((a, b) => a - b)
  if (!sizes.length) return null
  const mid = Math.floor(sizes.length / 2)
  return sizes.length % 2 ? sizes[mid] : (sizes[mid - 1] + sizes[mid]) / 2
}

export function totals(logs: PerformanceLog[]): Totals {
  return {
    shows: logs.length,
    stageSeconds: logs.reduce((s, l) => s + l.duration_seconds, 0),
    rating: weightedRating(logs),
    audience: medianAudience(logs),
  }
}
