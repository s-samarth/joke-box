/** Filters, sorting, paging and stats for performance logs (all in the browser, offline too). */
import type { PerformanceLog } from '../../api/types'

export interface Band {
  label: string
  min: number
  max: number
}

/** Same bands as the original app. `max` is exclusive. */
export const DURATION_BANDS: Band[] = [
  { label: '< 5 min', min: 0, max: 300 },
  { label: '5–10 min', min: 300, max: 600 },
  { label: '10–15 min', min: 600, max: 900 },
  { label: '15–30 min', min: 900, max: 1800 },
  { label: '30–60 min', min: 1800, max: 3600 },
  { label: '60+ min', min: 3600, max: Infinity },
]

export const AUDIENCE_BANDS: Band[] = [
  { label: '< 5', min: 0, max: 5 },
  { label: '5–10', min: 5, max: 11 },
  { label: '11–20', min: 11, max: 21 },
  { label: '21–50', min: 21, max: 51 },
  { label: '51–100', min: 51, max: 101 },
  { label: '100+', min: 101, max: Infinity },
]

export interface LogFilters {
  venues: string[]
  from: string // YYYY-MM-DD, inclusive, IST
  to: string
  rating: number | null
  duration: string | null
  audience: string | null
}

export const NO_FILTERS: LogFilters = { venues: [], from: '', to: '', rating: null, duration: null, audience: null }

export type SortKey = 'date' | 'duration' | 'audience' | 'rating'

const inBand = (bands: Band[], label: string | null, value: number) => {
  const band = bands.find((b) => b.label === label)
  return !band || (value >= band.min && value < band.max)
}

/** The IST calendar date of an ISO instant. */
const istDay = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10)

export function applyFilters(logs: PerformanceLog[], f: LogFilters): PerformanceLog[] {
  return logs.filter((log) => {
    const day = istDay(log.performed_at)
    return (
      (!f.venues.length || f.venues.includes(log.venue_name)) &&
      (!f.from || day >= f.from) &&
      (!f.to || day <= f.to) &&
      (f.rating === null || log.rating === f.rating) &&
      inBand(DURATION_BANDS, f.duration, log.duration_seconds) &&
      inBand(AUDIENCE_BANDS, f.audience, log.audience_size)
    )
  })
}

export function sortLogs(logs: PerformanceLog[], key: SortKey, desc: boolean): PerformanceLog[] {
  const value = (l: PerformanceLog) =>
    key === 'date' ? l.performed_at : key === 'duration' ? l.duration_seconds : key === 'audience' ? l.audience_size : l.rating
  return [...logs].sort((a, b) => {
    const [x, y] = [value(a), value(b)]
    const cmp = x < y ? -1 : x > y ? 1 : 0
    return desc ? -cmp : cmp
  })
}

/** Rating weighted by stage time: a 20-minute set counts more than a 3-minute one. */
export function weightedRating(logs: PerformanceLog[]): number | null {
  const time = logs.reduce((s, l) => s + l.duration_seconds, 0)
  if (!time) return logs.length ? logs.reduce((s, l) => s + l.rating, 0) / logs.length : null
  return logs.reduce((s, l) => s + l.rating * l.duration_seconds, 0) / time
}

export function stats(logs: PerformanceLog[]) {
  const counts = new Map<string, number>()
  for (const l of logs) counts.set(l.venue_name, (counts.get(l.venue_name) ?? 0) + 1)
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
  return {
    totalSets: logs.length,
    stageSeconds: logs.reduce((s, l) => s + l.duration_seconds, 0),
    rating: weightedRating(logs),
    topVenue: top?.[0] ?? null,
  }
}

export const PAGE_SIZE = 10
