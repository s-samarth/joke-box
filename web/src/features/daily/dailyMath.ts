/**
 * The daily joke habit. A day counts when at least one joke was added to JokeBox that day (IST),
 * however it got there: quick capture, the new joke sheet, or an import that kept its old date.
 * No extra table: it's read straight from the jokes' created dates, so it can never drift.
 */
import type { Joke } from '../../api/types'
import { toIstInput } from '../../lib/time'

/** How the habit is going, from the day of your last joke. */
export type Mood = 'done' | 'due' | 'slipping' | 'gone'

export interface Habit {
  /** Days since your last joke: 0 means you wrote one today. Null if you never have. */
  gap: number | null
  /** Days in a row ending today, or yesterday if today isn't written yet (it's still alive). */
  current: number
  longest: number
  mood: Mood
}

const DAY = 86_400_000
const toTime = (date: string) => Date.parse(`${date}T00:00:00Z`)
/** Whole days from `a` to `b`, both YYYY-MM-DD. */
export const daysBetween = (a: string, b: string): number => Math.round((toTime(b) - toTime(a)) / DAY)
export const shiftDay = (date: string, days: number): string => new Date(toTime(date) + days * DAY).toISOString().slice(0, 10)

/** Jokes by the IST day they were added, oldest first within a day. */
export function jokesByDay(jokes: Joke[]): Map<string, Joke[]> {
  const days = new Map<string, Joke[]>()
  for (const b of [...jokes].sort((x, y) => x.created_at.localeCompare(y.created_at))) {
    const day = toIstInput(b.created_at).slice(0, 10)
    days.set(day, [...(days.get(day) ?? []), b])
  }
  return days
}

/**
 * Today written: green. Yesterday or the day before: yellow, write one today. Three days to a
 * week: red. Over a week: gone quiet.
 */
export function moodFor(gap: number | null): Mood {
  if (gap === 0) return 'done'
  if (gap === null || gap <= 2) return 'due'
  if (gap <= 7) return 'slipping'
  return 'gone'
}

export function habit(days: Iterable<string>, today: string): Habit {
  const written = [...new Set(days)].filter((d) => d <= today).sort()
  if (!written.length) return { gap: null, current: 0, longest: 0, mood: 'due' }
  const set = new Set(written)
  let longest = 1
  let run = 1
  for (let i = 1; i < written.length; i++) {
    run = daysBetween(written[i - 1], written[i]) === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
  }
  const gap = daysBetween(written[written.length - 1], today)
  let current = 0
  if (gap <= 1) for (let d = written[written.length - 1]; set.has(d); d = shiftDay(d, -1)) current++
  return { gap, current, longest, mood: moodFor(gap) }
}

/** The weeks of a month, Monday first; days outside the month are null. */
export function monthWeeks(month: string): (string | null)[][] {
  const first = `${month}-01`
  const lead = (new Date(toTime(first)).getUTCDay() + 6) % 7
  const days: (string | null)[] = Array.from({ length: lead }, () => null)
  for (let d = first; d.startsWith(month); d = shiftDay(d, 1)) days.push(d)
  while (days.length % 7) days.push(null)
  return Array.from({ length: days.length / 7 }, (_, w) => days.slice(w * 7, w * 7 + 7))
}

/** The month before or after a YYYY-MM month. */
export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + by, 1))
  return d.toISOString().slice(0, 7)
}
