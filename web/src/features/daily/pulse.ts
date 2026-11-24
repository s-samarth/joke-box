/**
 * The writing pulse: how the writing is going, worked out from what's already saved (dates,
 * links, statuses), so there is nothing to log. Shown by WritingPulse on Activity:
 * where everything stands (each kind by status), how far ideas got (of the last 90 days) with the
 * narrowest step called out, month on month (pulseTrends.ts), when you write, what's idle, and a
 * few plain sentences (pulseNotes.ts).
 *
 * Claude reads the same pulse through the connector (app/connector/pulse.py), which works it out
 * again on the server: change a rule here and there together.
 */
import { PREMISE_STATUSES, type Premise } from '../../api/premises'
import type { Joke, Observation } from '../../api/types'
import { statusOf } from '../../lib/jokeMeta'
import { toIstInput } from '../../lib/time'
import { daysBetween } from './dailyMath'
import { pulseNotes } from './pulseNotes'
import { monthOnMonth, rhythm, type MonthRow, type Rhythm } from './pulseTrends'

export interface PulseInput {
  jokes: Joke[]
  premises: Premise[]
  observations: Observation[]
  /** Has a joke, premise or brainstorm come from it (useUses, the same test as "Not used yet"). */
  used: (o: Observation) => boolean
  topicName: (id: string | null) => string
  /** Your joke statuses in your order, Draft first. */
  statusOrder: string[]
  /** Today in India, YYYY-MM-DD. */
  today: string
}

/** A count by status (or, for observations, by whether anything came of them), in order. */
export interface Standing {
  kind: 'observations' | 'premises' | 'jokes'
  parts: { label: string; count: number }[]
}

export interface Step {
  kind: 'observations' | 'premises' | 'jokes'
  label: string
  done: number
  of: number
}

export interface Idle {
  label: string
  count: number
  /** The list that shows them. */
  to: string
}

export interface Pulse {
  standing: Standing[]
  steps: Step[]
  /** The step fewest ideas get through, once it has enough to judge (null otherwise). */
  narrowest: Step | null
  months: MonthRow[]
  rhythm: Rhythm | null
  idle: Idle[]
  notes: string[]
  /** Too little written for any of it to mean much yet. */
  thin: boolean
}

export const WINDOW = 90
/** A draft nobody has touched for this many days is sitting idle. */
export const STALE = 30
/** A step needs this many ideas in it before it can be called the narrowest. */
export const ENOUGH_TO_JUDGE = 5
export const STEP_LABELS = ['Observations that led somewhere', 'Premises with a joke on them', 'Jokes marked Stage Ready'] as const

/** How many days ago something was written (0 is today), by India's calendar. */
export const daysAgo = (iso: string, today: string): number => daysBetween(toIstInput(iso).slice(0, 10), today)

export const within = <T extends { created_at: string }>(items: T[], today: string, from: number, to: number): T[] =>
  items.filter((i) => {
    const ago = daysAgo(i.created_at, today)
    return ago >= from && ago < to
  })

export const isStageReady = (j: Joke): boolean => statusOf(j.status).trim().toLowerCase() === 'stage ready'

/** The three steps over some observations, premises and jokes: how many of each went on. */
export function stepsOf(input: Pick<PulseInput, 'used'>, built: Set<string>, observations: Observation[], premises: Premise[], jokes: Joke[]): Step[] {
  return [
    { kind: 'observations', label: STEP_LABELS[0], done: observations.filter(input.used).length, of: observations.length },
    { kind: 'premises', label: STEP_LABELS[1], done: premises.filter((p) => built.has(p.id)).length, of: premises.length },
    { kind: 'jokes', label: STEP_LABELS[2], done: jokes.filter(isStageReady).length, of: jokes.length },
  ]
}

/** Lowest share through, among steps with enough in them; the first wins a tie. */
export function narrowestOf(steps: Step[]): Step | null {
  const judged = steps.filter((s) => s.of >= ENOUGH_TO_JUDGE)
  return judged.reduce<Step | null>((low, s) => (!low || s.done / s.of < low.done / low.of ? s : low), null)
}

/** Each kind split by where it stands. Jokes follow your status order; any other name comes after. */
function standingOf({ jokes, premises, observations, used, statusOrder }: PulseInput): Standing[] {
  const led = observations.filter(used).length
  const byStatus = new Map<string, number>()
  for (const j of jokes) byStatus.set(statusOf(j.status), (byStatus.get(statusOf(j.status)) ?? 0) + 1)
  const names = [...statusOrder.filter((s) => byStatus.has(s)), ...[...byStatus.keys()].filter((s) => !statusOrder.includes(s))]
  return [
    { kind: 'observations', parts: [{ label: 'Led somewhere', count: led }, { label: 'Unused', count: observations.length - led }] },
    { kind: 'premises', parts: PREMISE_STATUSES.map((s) => ({ label: s, count: premises.filter((p) => p.status === s).length })) },
    { kind: 'jokes', parts: names.map((s) => ({ label: s, count: byStatus.get(s) ?? 0 })) },
  ]
}

export function pulse(input: PulseInput): Pulse {
  const { jokes, premises, observations, used, today } = input
  const built = new Set(jokes.map((j) => j.premise_id).filter((id): id is string => Boolean(id)))
  const steps = stepsOf(input, built, within(observations, today, 0, WINDOW), within(premises, today, 0, WINDOW), within(jokes, today, 0, WINDOW))

  const stale = jokes.filter((j) => statusOf(j.status) === 'Draft' && daysAgo(j.updated_at, today) >= STALE)
  const idle: Idle[] = [
    { label: 'observations unused', count: observations.filter((o) => !used(o)).length, to: '/observations?unused=1' },
    { label: 'premises with no joke', count: premises.filter((p) => !built.has(p.id)).length, to: '/premises?sort=fewest' },
    { label: `drafts untouched for ${STALE} days`, count: stale.length, to: '/jokes?status=Draft' },
  ].filter((i) => i.count > 0)

  const thin = jokes.length + premises.length + observations.length < 5
  return {
    standing: standingOf(input),
    steps,
    narrowest: thin ? null : narrowestOf(steps),
    months: monthOnMonth(input, built),
    rhythm: rhythm(input),
    idle,
    notes: thin ? [] : pulseNotes(input),
    thin,
  }
}
