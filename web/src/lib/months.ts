/**
 * Lists by month, for the month headings and the time scrubber on Observations, Voice notes and
 * Jokes. Months are IST months, keyed "YYYY-MM".
 */
import { toIstInput } from './time'

export type Order = 'new' | 'old'

export interface MonthGroup<T> {
  key: string
  label: string
  items: T[]
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** The IST month an ISO time falls in, as "YYYY-MM". */
export const monthOf = (iso: string): string => toIstInput(iso).slice(0, 7)

/** "2025-03" → "March 2025". */
export const monthLabel = (key: string): string => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`

/** Sort by a date, newest or oldest first. */
export const byDate = <T>(dateOf: (t: T) => string, order: Order) => (a: T, b: T): number =>
  order === 'new' ? dateOf(b).localeCompare(dateOf(a)) : dateOf(a).localeCompare(dateOf(b))

/** Runs of items in the same month, in the order given (sort first). */
export function groupByMonth<T>(items: T[], dateOf: (t: T) => string): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = []
  for (const item of items) {
    const key = monthOf(dateOf(item))
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(item)
    else groups.push({ key, label: monthLabel(key), items: [item] })
  }
  return groups
}

/** The element id a month's section gets, so the scrubber can jump to it. */
export const monthAnchor = (scope: string, key: string): string => `${scope}-month-${key}`
