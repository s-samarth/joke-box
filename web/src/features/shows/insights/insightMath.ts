/**
 * Strengths and weak spots: your shows grouped by topic, venue, set length and time of night.
 * Ratings are weighted by stage time, as everywhere in Shows, and each group is compared with your
 * own overall rating, so "+0.4" means that topic goes better than you usually do.
 */
import type { PerformanceLog, Topic } from '../../../api/types'
import { topicName } from '../../../lib/bitMeta'
import { toIstInput } from '../../../lib/time'
import { DURATION_BANDS } from '../logMath'
import { weightedRating } from '../logStats'

/**
 * Below this many shows a group's rating is mostly luck, so it is never called better or worse.
 * A hard rule for topics, venues, set lengths and time slots alike.
 */
export const MIN_SHOWS = 7

export interface Group {
  key: string
  label: string
  shows: number
  seconds: number
  rating: number
  /** Rating minus your overall rating for the same shows. */
  delta: number
  /** Share of shows rated 4 or 5 stars. */
  great: number
  /** Share of shows rated 1 or 2 stars. */
  rough: number
}

export interface Breakdown {
  ranked: Group[]
  few: Group[]
}

/** Time slots by IST start time. After midnight counts as the late slot. */
export const SLOTS = [
  { key: 'day', label: 'Before 6 pm', starting: 'before 6 pm' },
  { key: '18', label: '6 to 8 pm', starting: 'between 6 and 8 pm' },
  { key: '20', label: '8 to 9 pm', starting: 'between 8 and 9 pm' },
  { key: '21', label: '9 to 10 pm', starting: 'between 9 and 10 pm' },
  { key: '22', label: '10 to 11 pm', starting: 'between 10 and 11 pm' },
  { key: 'late', label: '11 pm or later', starting: 'at 11 pm or later' },
]

/** "before 6 pm", "between 8 and 9 pm": a slot as it reads after "Shows starting". */
export const slotPhrase = (key: string): string => SLOTS.find((s) => s.key === key)?.starting ?? key

export function slotOf(iso: string): string {
  const hour = Number(toIstInput(iso).slice(11, 13))
  if (hour >= 23 || hour < 5) return 'late'
  if (hour < 18) return 'day'
  if (hour < 20) return '18'
  return String(hour)
}

const lengthBand = (seconds: number): string =>
  (DURATION_BANDS.find((b) => seconds >= b.min && seconds < b.max) ?? DURATION_BANDS[0]).label

/**
 * Group shows and rate each group. A show can sit in several groups (a set with three topics
 * counts for all three). Pass `order` for groups with a natural order, like set lengths;
 * otherwise the best group comes first.
 */
export function breakdown(logs: PerformanceLog[], keysOf: (l: PerformanceLog) => string[], labelOf: (key: string) => string, order?: string[]): Breakdown {
  const overall = weightedRating(logs) ?? 0
  const buckets = new Map<string, PerformanceLog[]>()
  for (const log of logs) for (const key of new Set(keysOf(log))) buckets.set(key, [...(buckets.get(key) ?? []), log])
  const groups = [...buckets].map(([key, shows]): Group => {
    const rating = weightedRating(shows) ?? 0
    return {
      key, label: labelOf(key), shows: shows.length, rating, delta: rating - overall,
      seconds: shows.reduce((s, l) => s + l.duration_seconds, 0),
      great: shows.filter((l) => l.rating >= 4).length / shows.length,
      rough: shows.filter((l) => l.rating <= 2).length / shows.length,
    }
  })
  const sorted = order
    ? order.flatMap((key) => groups.filter((g) => g.key === key))
    : groups.sort((a, b) => b.delta - a.delta || b.shows - a.shows || a.label.localeCompare(b.label))
  return { ranked: sorted.filter((g) => g.shows >= MIN_SHOWS), few: sorted.filter((g) => g.shows < MIN_SHOWS) }
}

export function byTopic(logs: PerformanceLog[], topics: Topic[]): Breakdown {
  const known = new Map(topics.map((t) => [t.id, topicName(t)]))
  return breakdown(logs, (l) => l.topic_ids.filter((id) => known.has(id)), (id) => known.get(id) ?? '')
}

export const byVenue = (logs: PerformanceLog[]): Breakdown => breakdown(logs, (l) => [l.venue_name], (v) => v)

export const byLength = (logs: PerformanceLog[]): Breakdown =>
  breakdown(logs, (l) => [lengthBand(l.duration_seconds)], (b) => b, DURATION_BANDS.map((b) => b.label))

export const bySlot = (logs: PerformanceLog[]): Breakdown =>
  breakdown(logs, (l) => [slotOf(l.performed_at)], (k) => SLOTS.find((s) => s.key === k)?.label ?? k, SLOTS.map((s) => s.key))
