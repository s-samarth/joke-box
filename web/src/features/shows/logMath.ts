/** Filters and sorting for performance logs (all in the browser, offline too). */
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

export type Period = 'all' | 'month' | 'week'

export const PERIODS: Record<Period, string> = { all: 'Lifetime', month: 'This month', week: 'This week' }

export interface LogFilters {
  period: Period
  venues: string[]
  from: string // YYYY-MM-DD, inclusive, IST
  to: string
  rating: number | null
  duration: string | null
  audience: string | null
}

export const NO_FILTERS: LogFilters = { period: 'all', venues: [], from: '', to: '', rating: null, duration: null, audience: null }

/** How many of the "more filters" (everything except period and venue) are set. */
export const extraFilterCount = (f: LogFilters): number =>
  [f.from, f.to, f.rating, f.duration, f.audience].filter((v) => v !== '' && v !== null).length

export type SortKey = 'date' | 'venue' | 'duration' | 'audience' | 'rating'

export interface Sort {
  key: SortKey
  desc: boolean
}

const inBand = (bands: Band[], label: string | null, value: number) => {
  const band = bands.find((b) => b.label === label)
  return !band || (value >= band.min && value < band.max)
}

/** The IST calendar date of an ISO instant. */
const istDay = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString().slice(0, 10)

/** First day of the period containing `today` (YYYY-MM-DD). Weeks start on Monday. Empty for lifetime. */
export function periodStart(period: Period, today: string): string {
  if (period === 'month') return `${today.slice(0, 7)}-01`
  if (period === 'week') {
    const d = new Date(`${today}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
    return d.toISOString().slice(0, 10)
  }
  return ''
}

/** `today` is the IST date, passed in so this stays a pure function. */
export function applyFilters(logs: PerformanceLog[], f: LogFilters, today: string): PerformanceLog[] {
  const start = periodStart(f.period, today)
  return logs.filter((log) => {
    const day = istDay(log.performed_at)
    return (
      (!start || day >= start) &&
      (!f.venues.length || f.venues.includes(log.venue_name)) &&
      (!f.from || day >= f.from) &&
      (!f.to || day <= f.to) &&
      (f.rating === null || log.rating === f.rating) &&
      inBand(DURATION_BANDS, f.duration, log.duration_seconds) &&
      inBand(AUDIENCE_BANDS, f.audience, log.audience_size)
    )
  })
}

export function sortLogs(logs: PerformanceLog[], { key, desc }: Sort): PerformanceLog[] {
  const value = (l: PerformanceLog): string | number =>
    key === 'date' ? l.performed_at
      : key === 'venue' ? l.venue_name.toLowerCase()
        : key === 'duration' ? l.duration_seconds
          : key === 'audience' ? l.audience_size
            : l.rating
  return [...logs].sort((a, b) => {
    const [x, y] = [value(a), value(b)]
    const cmp = x < y ? -1 : x > y ? 1 : b.performed_at.localeCompare(a.performed_at)
    return desc ? -cmp : cmp
  })
}

export const PAGE_SIZE = 25
