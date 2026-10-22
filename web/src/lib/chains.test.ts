import { describe, expect, it } from 'vitest'
import { chainTo, followersOf, laterThan } from './chains'

// a <- b <- c, and a <- d (a branch)
const jokes = [
  { id: 'a', follows_id: null },
  { id: 'b', follows_id: 'a' },
  { id: 'c', follows_id: 'b' },
  { id: 'd', follows_id: 'a' },
]
const byId = new Map(jokes.map((b) => [b.id, b]))

describe('chains', () => {
  it('walks back to the first joke', () => {
    expect(chainTo(jokes[2], byId).map((b) => b.id)).toEqual(['a', 'b', 'c'])
    expect(chainTo(jokes[3], byId).map((b) => b.id)).toEqual(['a', 'd'])
  })

  it('stops at a joke it cannot see', () => {
    const noA = new Map([...byId].filter(([id]) => id !== 'a'))
    expect(chainTo(jokes[2], noA).map((b) => b.id)).toEqual(['b', 'c'])
  })

  it('finds followers and everything later on every branch', () => {
    expect(followersOf('a', jokes).map((b) => b.id)).toEqual(['b', 'd'])
    expect([...laterThan('a', jokes)].sort()).toEqual(['a', 'b', 'c', 'd'])
    expect([...laterThan('b', jokes)].sort()).toEqual(['b', 'c'])
  })
})
