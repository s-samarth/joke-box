/**
 * The pulse's plain sentences, each from a simple rule over what's saved (no AI, no guessing):
 * a kind you haven't written in weeks, and the topic with the biggest pile of observations nothing
 * has come from. When you write is a chart of its own now (rhythm in pulseTrends.ts).
 * The same rules as app/connector/pulse_notes.py, which Claude reads: change them together.
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
const dayOf = (iso: string) => toIstInput(iso).slice(0, 10)
const ago = (iso: string, today: string) => daysBetween(dayOf(iso), today)

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

export function pulseNotes(input: PulseInput): string[] {
  return [quiet(input), pile(input)].filter((n): n is string => n !== null)
}
