/**
 * The writing pulse: how the writing is going, worked out from what's already saved (dates,
 * links, punchlines, statuses), so there is nothing to log. Four parts, shown by WritingPulse:
 * the pace (the last 30 days against the 30 before), how far ideas get (of what was written in
 * the last 90 days), what's sitting idle, and a few plain sentences worth knowing.
 */
import type { Premise } from '../../api/premises'
import type { Joke, Observation } from '../../api/types'
import { toIstInput } from '../../lib/time'
import { KINDS, type Kind } from './activity'
import { daysBetween } from './dailyMath'
import { pulseNotes } from './pulseNotes'

export interface PulseInput {
  jokes: Joke[]
  premises: Premise[]
  observations: Observation[]
  /** Has a joke, premise or brainstorm come from it (useUses, the same test as "Not used yet"). */
  used: (o: Observation) => boolean
  topicName: (id: string | null) => string
  /** Today in India, YYYY-MM-DD. */
  today: string
}

export interface Pace {
  kind: Kind
  /** Written in the last 30 days, and in the 30 before those. */
  now: number
  before: number
}

export interface Step {
  kind: Kind
  label: string
  done: number
  of: number
}

export interface Idle {
  label: string
  count: number
  /** The list that shows them, where there's a filter for it. */
  to?: string
}

export interface Pulse {
  pace: Pace[]
  steps: Step[]
  idle: Idle[]
  notes: string[]
  /** Too little written for any of it to mean much yet. */
  thin: boolean
}

export const RECENT = 30
export const WINDOW = 90
/** A draft nobody has touched for this many days is sitting idle. */
export const STALE = 30
const FINISHED = new Set(['stage ready', 'complete'])

/** How many days ago something was written (0 is today), by India's calendar. */
export const daysAgo = (iso: string, today: string): number => daysBetween(toIstInput(iso).slice(0, 10), today)

const within = <T extends { created_at: string }>(items: T[], today: string, from: number, to: number): T[] =>
  items.filter((i) => {
    const ago = daysAgo(i.created_at, today)
    return ago >= from && ago < to
  })

export const hasPunch = (j: Joke): boolean => j.punchline.trim().length > 0
export const isFinished = (j: Joke): boolean => FINISHED.has((j.status ?? '').trim().toLowerCase())

export function pulse(input: PulseInput): Pulse {
  const { jokes, premises, observations, used, today } = input
  const lists: Record<Kind, { created_at: string }[]> = { observations, premises, jokes }
  const pace = KINDS.map((kind) => ({ kind, now: within(lists[kind], today, 0, RECENT).length, before: within(lists[kind], today, RECENT, 2 * RECENT).length }))

  const built = new Set(jokes.map((j) => j.premise_id).filter(Boolean))
  const recent = { observations: within(observations, today, 0, WINDOW), premises: within(premises, today, 0, WINDOW), jokes: within(jokes, today, 0, WINDOW) }
  const steps: Step[] = [
    { kind: 'observations', label: 'Observations that led somewhere', done: recent.observations.filter(used).length, of: recent.observations.length },
    { kind: 'premises', label: 'Premises with a joke on them', done: recent.premises.filter((p) => built.has(p.id)).length, of: recent.premises.length },
    { kind: 'jokes', label: 'Jokes with a punchline', done: recent.jokes.filter(hasPunch).length, of: recent.jokes.length },
    { kind: 'jokes', label: 'Jokes marked Stage Ready or Complete', done: recent.jokes.filter(isFinished).length, of: recent.jokes.length },
  ]

  const stale = jokes.filter((j) => (j.status ?? 'Draft') === 'Draft' && daysAgo(j.updated_at, today) >= STALE)
  const idle: Idle[] = [
    { label: 'observations nothing has come from', count: observations.filter((o) => !used(o)).length, to: '/observations?unused=1' },
    { label: 'premises with no joke yet', count: premises.filter((p) => !built.has(p.id)).length, to: '/premises?sort=fewest' },
    { label: 'jokes without a punchline', count: jokes.filter((j) => !hasPunch(j)).length },
    { label: `drafts not touched in ${STALE} days`, count: stale.length, to: '/jokes?status=Draft' },
  ].filter((i) => i.count > 0)

  const thin = jokes.length + premises.length + observations.length < 5
  return { pace, steps, idle, notes: thin ? [] : pulseNotes(input), thin }
}
