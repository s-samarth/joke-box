import { describe, expect, it } from 'vitest'
import { topicMoveMessage } from './topics'

describe('topicMoveMessage', () => {
  it('names jokes, premises and shows together', () => {
    expect(topicMoveMessage({ jokes: 3, premises: 1, shows: 2 })).toBe('Its 3 jokes, 1 premise and 2 logged shows move to Thoughts.')
  })

  it('counts premises even with no jokes', () => {
    expect(topicMoveMessage({ jokes: 0, premises: 4, shows: 0 })).toBe('Its 4 premises move to Thoughts.')
  })

  it('says "moves" for a single thing', () => {
    expect(topicMoveMessage({ jokes: 0, premises: 1, shows: 0 })).toBe('Its 1 premise moves to Thoughts.')
  })

  it('says when nothing is filed under it', () => {
    expect(topicMoveMessage({ jokes: 0, premises: 0, shows: 0 })).toBe('Nothing is filed under it.')
  })
})
