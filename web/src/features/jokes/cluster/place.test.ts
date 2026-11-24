import { describe, expect, it } from 'vitest'
import type { Joke, Topic } from '../../../api/types'
import { clustersAt, placeName, samePlace } from './place'

const topics: Topic[] = [
  { id: 't1', name: 'Fake topic', is_system: false, subtopics: [{ id: 'u1', name: 'Subtopic unknown', is_system: true }, { id: 's1', name: 'Fake sub' }, { id: 's2', name: 'Other sub' }] },
  { id: 't2', name: 'Other topic', is_system: false, subtopics: [] },
]
const joke = (id: string, cluster: string, topic: string, sub: string | null): Joke =>
  ({ id, setup: `Fake ${id}`, status: 'Testing', strength: null, cluster_id: cluster, topic_id: topic, subtopic_id: sub, created_at: '2026-01-01', updated_at: '2026-01-01' }) as Joke

describe('where a cluster lives', () => {
  const jokes = [joke('a', 'c1', 't1', 's1'), joke('b', 'c1', 't2', null), joke('c', 'c2', 't1', 's2'), joke('d', 'c3', 't1', null), joke('e', 'c4', 't2', null)]
  const clusters = [{ id: 'c1', lead_joke_id: 'a' }, { id: 'c2', lead_joke_id: 'c' }, { id: 'c3', lead_joke_id: 'd' }, { id: 'c4', lead_joke_id: 'e' }]

  it("is its lead's topic and subtopic, not its other versions'", () => {
    expect(clustersAt({ topicId: 't1', subtopicId: 's1' }, clusters, jokes, topics)).toEqual(['c1'])
    expect(clustersAt({ topicId: 't2', subtopicId: null }, clusters, jokes, topics)).toEqual(['c4'])
  })

  it('reads no subtopic as Subtopic unknown', () => {
    expect(samePlace({ topicId: 't1', subtopicId: null }, { topicId: 't1', subtopicId: 'u1' }, topics)).toBe(true)
    expect(clustersAt({ topicId: 't1', subtopicId: 'u1' }, clusters, jokes, topics)).toEqual(['c3'])
  })

  it('leaves out the cluster the joke is in', () => {
    expect(clustersAt({ topicId: 't1', subtopicId: 's1' }, clusters, jokes, topics, 'c1')).toEqual([])
  })

  it('is named by topic, and subtopic unless it is unknown', () => {
    expect(placeName({ topicId: 't1', subtopicId: 's1' }, topics)).toBe('Fake topic › Fake sub')
    expect(placeName({ topicId: 't1', subtopicId: 'u1' }, topics)).toBe('Fake topic')
  })
})
