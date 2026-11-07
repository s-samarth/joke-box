import { describe, expect, it } from 'vitest'
import { topicMoveMessage } from './topics'

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
