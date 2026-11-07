/**
 * Names and filters for observations. An observation always has a topic (a joke topic, Random
 * until you pick one) and a kind (one of yours, or none: a plain observation).
 */
import type { Named, Observation, Topic } from '../../api/types'
import { topicName } from '../../lib/jokeMeta'

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
