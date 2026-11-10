/**
 * The pulse's plain sentences, each from a simple rule over what's saved (no AI, no guessing):
 * a kind you haven't written in weeks, the topic with the biggest pile of observations nothing
 * has come from, and when you tend to write. At most three, most useful first.
 */
import { toIstInput } from '../../lib/time'
import { KIND_META, KINDS } from './activity'
import { daysBetween } from './dailyMath'
import type { PulseInput } from './pulse'

/** A kind gone this many days without a new one is worth a mention. */
const QUIET = 21
/** A topic needs this many observations, and this many unused, to count as a pile. */
const PILE = 5
const UNUSED = 3
/** When you write is read from the last 90 days, once there are this many pieces. */
const WINDOW = 90
const ENOUGH = 10
const DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']

const dayOf = (iso: string) => toIstInput(iso).slice(0, 10)
const ago = (iso: string, today: string) => daysBetween(dayOf(iso), today)

/** "in the morning" (5 to noon), "in the afternoon" (to 5), "in the evening" (to 10), "at night". */
export function partOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return 'in the morning'
  if (hour >= 12 && hour < 17) return 'in the afternoon'
  if (hour >= 17 && hour < 22) return 'in the evening'
  return 'at night'
}

const top = <K>(counts: Map<K, number>): [K, number] | undefined => [...counts].sort((a, b) => b[1] - a[1])[0]
const tally = <K>(keys: K[]): Map<K, number> => {
  const counts = new Map<K, number>()
  for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1)
  return counts
}

/** "No new premise in 24 days.", for the kind that's been quiet longest (and has been written before). */
function quiet({ jokes, premises, observations, today }: PulseInput): string | null {
  const lists = { observations, premises, jokes }
  const gaps = KINDS.filter((k) => lists[k].length).map((k) => ({ kind: k, days: Math.min(...lists[k].map((i) => ago(i.created_at, today))) }))
  const worst = gaps.sort((a, b) => b.days - a.days)[0]
  return worst && worst.days >= QUIET ? `No new ${KIND_META[worst.kind].one} in ${worst.days} days.` : null
}

/** The topic whose observations have gone furthest unused. */
function pile({ observations, jokes, used, topicName }: PulseInput): string | null {
  const live = new Set(jokes.map((j) => j.id))
  const topics = new Map<string | null, { all: number; unused: number; jokes: Set<string> }>()
  for (const o of observations) {
    const t = topics.get(o.topic_id) ?? { all: 0, unused: 0, jokes: new Set<string>() }
    t.all++
    if (!used(o)) t.unused++
    for (const id of o.joke_ids ?? []) if (live.has(id)) t.jokes.add(id)
    topics.set(o.topic_id, t)
  }
  const found = [...topics].filter(([, t]) => t.all >= PILE && t.unused >= UNUSED).sort((a, b) => b[1].unused - a[1].unused)[0]
  if (!found) return null
  const [id, t] = found
  const came = t.jokes.size === 0 ? 'no joke has' : t.jokes.size === 1 ? '1 joke has' : `${t.jokes.size} jokes have`
  return `${topicName(id)} holds ${t.all} observations and ${came} come from them: ${t.unused} are still unused.`
}

/** "You write most on Sundays, and mostly at night." */
function rhythm({ jokes, premises, observations, today }: PulseInput): string | null {
  const when = [...jokes, ...premises, ...observations].map((i) => i.created_at).filter((iso) => ago(iso, today) < WINDOW)
  if (when.length < ENOUGH) return null
  const day = top(tally(when.map((iso) => new Date(`${dayOf(iso)}T12:00:00Z`).getUTCDay())))
  const part = top(tally(when.map((iso) => partOfDay(Number(toIstInput(iso).slice(11, 13))))))
  if (!day || !part) return null
  return `You write most on ${DAYS[day[0]]} (${day[1]} of your last ${when.length} pieces), and mostly ${part[0]}.`
}

export function pulseNotes(input: PulseInput): string[] {
  return [quiet(input), pile(input), rhythm(input)].filter((n): n is string => n !== null)
}
