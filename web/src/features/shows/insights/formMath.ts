/**
 * Recent form (your latest shows against the ones just before) and each topic's life month by
 * month. Both count shows rather than dates, so they work however long ago you last went up.
 */
import type { PerformanceLog, Topic } from '../../../api/types'
import { topicName } from '../../../lib/bitMeta'
import { toIstInput } from '../../../lib/time'
import { weightedRating } from '../logStats'
import { MIN_SHOWS } from './insightMath'

const byDate = (a: PerformanceLog, b: PerformanceLog) => a.performed_at.localeCompare(b.performed_at)
const monthOf = (l: PerformanceLog) => toIstInput(l.performed_at).slice(0, 7)

export interface FormStats {
  rating: number | null
  /** Share of shows at 4 stars or more. */
  great: number
  /** Share of shows at 2 stars or less. */
  rough: number
  /** Average time on stage, in seconds. */
  seconds: number
}

export interface Form {
  size: number
  now: FormStats
  /** The same number of shows just before; null until there are enough of them. */
  before: FormStats | null
}

function stats(logs: PerformanceLog[]): FormStats {
  return {
    rating: weightedRating(logs),
    great: logs.filter((l) => l.rating >= 4).length / logs.length,
    rough: logs.filter((l) => l.rating <= 2).length / logs.length,
    seconds: logs.reduce((s, l) => s + l.duration_seconds, 0) / logs.length,
  }
}

/** Your last `size` shows against the `size` before them. */
export function recentForm(logs: PerformanceLog[], size = 10): Form | null {
  if (!logs.length) return null
  const sorted = [...logs].sort(byDate)
  const now = sorted.slice(-size)
  const before = sorted.slice(-2 * now.length, -now.length)
  return { size: now.length, now: stats(now), before: before.length === now.length ? stats(before) : null }
}

export interface TopicRow {
  id: string
  label: string
  shows: number
  /** Shows of this topic in each month, in the same order as the month keys passed in. */
  months: PerformanceLog[][]
}

/**
 * One row per topic with enough shows to read, in the order you first did them, so the grid reads
 * like a history of your material. Thinner topics are returned apart.
 */
export function topicGrid(logs: PerformanceLog[], topics: Topic[], monthKeys: string[]): { rows: TopicRow[]; thin: TopicRow[] } {
  const rows = topics.flatMap((t): (TopicRow & { first: string })[] => {
    const shows = logs.filter((l) => l.topic_ids.includes(t.id)).sort(byDate)
    if (!shows.length) return []
    return [{ id: t.id, label: topicName(t), shows: shows.length, first: shows[0].performed_at, months: monthKeys.map((m) => shows.filter((l) => monthOf(l) === m)) }]
  })
  rows.sort((a, b) => a.first.localeCompare(b.first) || b.shows - a.shows)
  return { rows: rows.filter((r) => r.shows >= MIN_SHOWS), thin: rows.filter((r) => r.shows < MIN_SHOWS) }
}
