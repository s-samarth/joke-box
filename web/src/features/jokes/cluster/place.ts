/**
 * Where a cluster lives: its lead's topic and subtopic. A joke can only join a cluster that lives
 * where the joke is filed, so the picker lists the few clusters of one subtopic, never all of
 * them. No subtopic and the topic's Subtopic unknown count as the same place.
 */
import type { Cluster } from '../../../api/clusters'
import type { Joke, Topic } from '../../../api/types'
import { topicName } from '../../../lib/jokeMeta'
import { unknownOf } from '../../../lib/topics'
import { leadOf, versionsOf } from './lead'

export interface Place {
  topicId: string
  subtopicId: string | null
}

/** The subtopic, with "none" read as the topic's Subtopic unknown (when it has one). */
const subOf = (place: Place, topics: Topic[]) => place.subtopicId ?? unknownOf(topics.find((t) => t.id === place.topicId))?.id ?? null

export const samePlace = (a: Place, b: Place, topics: Topic[]) => a.topicId === b.topicId && subOf(a, topics) === subOf(b, topics)

/**
 * The clusters living at `place`, as ids. Only clusters with a version in the app (one whose
 * jokes are all in the Trash can't be joined); `except` leaves out the one the joke is already in.
 */
export function clustersAt(place: Place, clusters: Pick<Cluster, 'id' | 'lead_joke_id'>[], jokes: Joke[], topics: Topic[], except?: string | null): string[] {
  const ids = [...new Set(jokes.flatMap((j) => (j.cluster_id && j.cluster_id !== except ? [j.cluster_id] : [])))]
  return ids.filter((id) => {
    const lead = leadOf(clusters.find((c) => c.id === id), versionsOf(id, jokes))
    return lead !== undefined && samePlace({ topicId: lead.topic_id, subtopicId: lead.subtopic_id }, place, topics)
  })
}

/** "Dating › Apps", or just "Dating" when the subtopic is unknown. */
export function placeName(place: Place, topics: Topic[]): string {
  const topic = topics.find((t) => t.id === place.topicId)
  const sub = topic?.subtopics.find((s) => s.id === place.subtopicId)
  const name = topic ? topicName(topic) : 'this topic'
  return sub && !sub.is_system ? `${name} › ${sub.name}` : name
}
