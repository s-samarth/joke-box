import { describe, expect, it } from 'vitest'
import { topicMoveMessage, unknownOf } from './topics'

describe('topicMoveMessage', () => {
  it('names jokes, premises and shows together', () => {
    expect(topicMoveMessage({ jokes: 3, premises: 1, observations: 2, shows: 2 })).toBe('Its 3 jokes, 1 premise, 2 observations and 2 logged shows move to Random.')
  })

  it('counts premises even with no jokes', () => {
    expect(topicMoveMessage({ jokes: 0, premises: 4, observations: 0, shows: 0 })).toBe('Its 4 premises move to Random.')
  })

  it('says "moves" for a single thing', () => {
    expect(topicMoveMessage({ jokes: 0, premises: 1, observations: 0, shows: 0 })).toBe('Its 1 premise moves to Random.')
  })

  it('says when nothing is filed under it', () => {
    expect(topicMoveMessage({ jokes: 0, premises: 0, observations: 0, shows: 0 })).toBe('Nothing is filed under it.')
  })
  it('names observations, which move with the topic too', () => {
    expect(topicMoveMessage({ jokes: 0, premises: 0, observations: 1, shows: 0 })).toBe('Its 1 observation moves to Random.')
  })
})

describe("a topic's default subtopic", () => {
  it('is the protected one, whatever its place in the list', () => {
    const topic = { id: 't', name: 'Fake', is_system: false, subtopics: [{ id: 'a', name: 'Fake sub' }, { id: 'u', name: 'Subtopic unknown', is_system: true }] }
    expect(unknownOf(topic)?.id).toBe('u')
    expect(unknownOf({ ...topic, subtopics: [{ id: 'a', name: 'Fake sub' }] })).toBeUndefined()
    expect(unknownOf(undefined)).toBeUndefined()
  })
})
