import { describe, expect, it } from 'vitest'
import type { Joke } from '../../api/types'
import { chainItems, chainNote, lightState } from './setlistMath'

describe('the light', () => {
  it('turns on inside the last minute', () => {
    expect(lightState(300, 420)).toBe('ok')
    expect(lightState(360, 420)).toBe('light')
    expect(lightState(421, 420)).toBe('over')
  })
})

describe('chainItems', () => {
  const joke = (id: string, follows_id: string | null) => ({ id, follows_id, duration_seconds: 30 }) as Joke
  const jokes = [joke('a', null), joke('b', 'a'), joke('c', 'b')]
  const byId = new Map(jokes.map((b) => [b.id, b]))

  it('brings the jokes before it that are not in the set yet', () => {
    expect(chainItems(jokes[2], byId, new Set()).map((i) => i.joke_id)).toEqual(['a', 'b', 'c'])
    expect(chainItems(jokes[2], byId, new Set(['a'])).map((i) => i.joke_id)).toEqual(['b', 'c'])
    expect(chainNote(3)).toBe('Also added the 2 jokes before it')
    expect(chainNote(2)).toBe('Also added the joke before it')
    expect(chainNote(1)).toBeNull()
  })
})
