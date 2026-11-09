/**
 * Daily activity: what you wrote each day, split three ways (observations, premises, jokes), with
 * the colour each kind wears on the calendar. Read from the cached lists' created dates in IST,
 * the same way the joke streak is, so the calendar and the streak can never disagree.
 */
import type { Premise } from '../../api/premises'
import type { Joke, Observation } from '../../api/types'
import { byDay } from './dailyMath'

export type Kind = 'jokes' | 'premises' | 'observations'
/** The order every screen shows them in: raw material first, finished jokes last. */
export const KINDS: Kind[] = ['observations', 'premises', 'jokes']

/** How each kind looks: jokes keep the streak's green; premises periwinkle; observations orchid. */
export const KIND_META: Record<Kind, { one: string; many: string; dot: string; text: string }> = {
  jokes: { one: 'joke', many: 'jokes', dot: 'bg-ok', text: 'text-ok' },
  premises: { one: 'premise', many: 'premises', dot: 'bg-sky', text: 'text-sky' },
  observations: { one: 'observation', many: 'observations', dot: 'bg-orchid', text: 'text-orchid' },
}

/** "November 2026". */
export const monthName = (month: string) => new Date(`${month}-01T12:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'long', year: 'numeric' })

export const countLabel = (kind: Kind, n: number) => `${n} ${n === 1 ? KIND_META[kind].one : KIND_META[kind].many}`

export interface DayActivity {
  jokes: Joke[]
  premises: Premise[]
  observations: Observation[]
}

export type Counts = Record<Kind, number>

export type Activity = Map<string, DayActivity>

const EMPTY: DayActivity = { jokes: [], premises: [], observations: [] }

/** Every day anything was written, with what was written that day. */
export function activityByDay(jokes: Joke[], premises: Premise[], observations: Observation[]): Activity {
  const lists = { jokes: byDay(jokes), premises: byDay(premises), observations: byDay(observations) }
  const days: Activity = new Map()
  for (const kind of KINDS) {
    for (const [day, items] of lists[kind]) days.set(day, { ...(days.get(day) ?? EMPTY), [kind]: items })
  }
  return days
}

export const dayOf = (activity: Activity, day: string): DayActivity => activity.get(day) ?? EMPTY

export const countsOf = (d: DayActivity): Counts => ({ jokes: d.jokes.length, premises: d.premises.length, observations: d.observations.length })

export const totalOf = (c: Counts): number => c.jokes + c.premises + c.observations

/** How bright a day's box is, 0 (nothing) to 4 (a big day): 1, 2-3, 4-6, 7 or more pieces. */
export function heat(total: number): 0 | 1 | 2 | 3 | 4 {
  if (total <= 0) return 0
  if (total === 1) return 1
  if (total <= 3) return 2
  if (total <= 6) return 3
  return 4
}

export interface MonthSummary extends Counts {
  total: number
  /** Days of the month up to today. */
  sofar: number
  /** Days with anything written. */
  active: number
  /** Days with a new joke: the streak's days. */
  jokeDays: number
}

/** A month (YYYY-MM) added up, counting only days up to today. */
export function monthSummary(activity: Activity, month: string, today: string): MonthSummary {
  const sum: MonthSummary = { jokes: 0, premises: 0, observations: 0, total: 0, sofar: 0, active: 0, jokeDays: 0 }
  const last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).getUTCDate()
  for (let n = 1; n <= last; n++) {
    const day = `${month}-${String(n).padStart(2, '0')}`
    if (day > today) break
    sum.sofar++
    const c = countsOf(dayOf(activity, day))
    for (const kind of KINDS) sum[kind] += c[kind]
    const t = totalOf(c)
    sum.total += t
    if (t) sum.active++
    if (c.jokes) sum.jokeDays++
  }
  return sum
}
