/**
 * Names and filters for observations. An observation always has a topic (a joke topic, Random
 * until you pick one) and a kind (one of yours, or none: a plain observation).
 */
import type { Named, Observation, Topic } from '../../api/types'
import { byStrength, topicName } from '../../lib/jokeMeta'

/** The kind of an observation filed under no kind. */
export const PLAIN = 'Observation'
/** The URL value for "plain observation" (?kind=). */
export const PLAIN_KIND = 'plain'

export const kindLabel = (kinds: Named[], id: string | null) => (id && kinds.find((k) => k.id === id)?.name) || PLAIN

export const topicLabel = (topics: Topic[], id: string | null) => {
  const topic = id ? topics.find((t) => t.id === id) : undefined
  return topic ? topicName(topic) : null
}

/** Whether an observation is under the topic and kind in the URL (null means any). */
export function matchesFilters(o: Observation, topic: string | null, kind: string | null): boolean {
  const topicOk = topic === null || o.topic_id === topic
  const kindOk = kind === null || (kind === PLAIN_KIND ? o.kind_id === null : o.kind_id === kind)
  return topicOk && kindOk
}

export type ObservationSort = 'new' | 'old' | 'strong' | 'weak'

export const OBSERVATION_SORTS: Record<ObservationSort, string> = { new: 'Newest', old: 'Oldest', strong: 'Strongest', weak: 'Weakest' }

/** A sort from the URL (?sort=), or Newest for none (or one this version doesn't know). */
export const observationSort = (value: string | null): ObservationSort => (value && value in OBSERVATION_SORTS ? (value as ObservationSort) : 'new')

const newest = (a: Observation, b: Observation) => b.created_at.localeCompare(a.created_at)

/** These observations in that order (a new array). Unrated ones go after rated ones either way, newest first among equals. */
export function sortObservations(observations: Observation[], sort: ObservationSort): Observation[] {
  const by: Record<ObservationSort, (a: Observation, b: Observation) => number> = {
    new: newest,
    old: (a, b) => a.created_at.localeCompare(b.created_at),
    strong: (a, b) => byStrength(a.strength, b.strength, true) || newest(a, b),
    weak: (a, b) => byStrength(a.strength, b.strength, false) || newest(a, b),
  }
  return [...observations].sort(by[sort])
}
