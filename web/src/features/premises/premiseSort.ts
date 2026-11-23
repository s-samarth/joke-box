/**
 * How the premises list can be put in order. Newest first unless you pick another, like Jokes;
 * By topic keeps your topics' order, with each topic's newest first.
 */
import type { Premise } from '../../api/premises'
import { byStrength } from '../../lib/jokeMeta'

export type PremiseSort = 'new' | 'old' | 'topic' | 'strong' | 'weak' | 'most' | 'fewest'

export const PREMISE_SORTS: Record<PremiseSort, string> = {
  new: 'Newest',
  old: 'Oldest',
  topic: 'By topic',
  strong: 'Strongest',
  weak: 'Weakest',
  most: 'Most jokes',
  fewest: 'Fewest jokes',
}

/** A sort from the URL, or Newest for none (or one this version doesn't know). */
export const premiseSort = (value: string | null): PremiseSort => (value && value in PREMISE_SORTS ? (value as PremiseSort) : 'new')

const newest = (a: Premise, b: Premise) => b.created_at.localeCompare(a.created_at)

/** These premises in that order (a new array). `count` is how many jokes rest on one; `topicOrder` your topics' ids in order. */
export function sortPremises(premises: Premise[], sort: PremiseSort, count: (p: Premise) => number, topicOrder: string[]): Premise[] {
  const place = new Map(topicOrder.map((id, i) => [id, i]))
  const by: Record<PremiseSort, (a: Premise, b: Premise) => number> = {
    new: newest,
    old: (a, b) => a.created_at.localeCompare(b.created_at),
    topic: (a, b) => (place.get(a.topic_id) ?? 0) - (place.get(b.topic_id) ?? 0) || newest(a, b),
    strong: (a, b) => byStrength(a.strength, b.strength, true) || newest(a, b),
    weak: (a, b) => byStrength(a.strength, b.strength, false) || newest(a, b),
    most: (a, b) => count(b) - count(a) || newest(a, b),
    fewest: (a, b) => count(a) - count(b) || newest(a, b),
  }
  return [...premises].sort(by[sort])
}
