import { describe, expect, it } from 'vitest'
import { chainTo, followersOf, laterThan } from './chains'

// a <- b <- c, and a <- d (a branch)
const bits = [
  { id: 'a', follows_id: null },
  { id: 'b', follows_id: 'a' },
  { id: 'c', follows_id: 'b' },
  { id: 'd', follows_id: 'a' },
]
const byId = new Map(bits.map((b) => [b.id, b]))

describe('chains', () => {
  it('walks back to the first joke', () => {
    expect(chainTo(bits[2], byId).map((b) => b.id)).toEqual(['a', 'b', 'c'])
    expect(chainTo(bits[3], byId).map((b) => b.id)).toEqual(['a', 'd'])
  })

  it('stops at a joke it cannot see', () => {
    const noA = new Map([...byId].filter(([id]) => id !== 'a'))
    expect(chainTo(bits[2], noA).map((b) => b.id)).toEqual(['b', 'c'])
  })

  it('finds followers and everything later on every branch', () => {
    expect(followersOf('a', bits).map((b) => b.id)).toEqual(['b', 'd'])
    expect([...laterThan('a', bits)].sort()).toEqual(['a', 'b', 'c', 'd'])
    expect([...laterThan('b', bits)].sort()).toEqual(['b', 'c'])
  })
})
