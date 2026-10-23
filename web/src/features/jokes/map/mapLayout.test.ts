import { describe, expect, it } from 'vitest'
import { layoutMap, NODE } from './mapLayout'

const joke = (id: string, follows_id: string | null = null, day = 1) => ({ id, follows_id, created_at: `2026-01-${String(day).padStart(2, '0')}` })
const pos = (l: ReturnType<typeof layoutMap>, id: string) => {
  const n = l.nodes.find((x) => x.joke.id === id)!
  return [n.x, n.y]
}

describe('joke map layout', () => {
  it('draws a chain left to right, with an arrow per link', () => {
    const all = [joke('a'), joke('b', 'a'), joke('c', 'b')]
    const l = layoutMap(all, all)
    expect(l.chains).toBe(1)
    expect(pos(l, 'a')).toEqual([0, 0])
    expect(pos(l, 'c')[0]).toBe(2 * (NODE.w + 56))
    expect(l.edges.map((e) => `${e.from}>${e.to}`).sort()).toEqual(['a>b', 'b>c'])
    expect(l.edges.find((e) => e.to === 'b')).toMatchObject({ x1: NODE.w, x2: NODE.w + 56 })
  })

  it('stacks branches, oldest first, with the joke before them in the middle', () => {
    const all = [joke('a'), joke('late', 'a', 5), joke('early', 'a', 2)]
    const l = layoutMap(all, all)
    expect(pos(l, 'early')[1]).toBe(0)
    expect(pos(l, 'late')[1]).toBe(NODE.h + 16)
    expect(pos(l, 'a')[1]).toBe((NODE.h + 16) / 2)
    expect(l.height).toBe(2 * NODE.h + 16)
  })

  it('keeps a filtered chain whole, dimming the jokes the filters hide', () => {
    const all = [joke('a'), joke('b', 'a'), joke('alone')]
    const l = layoutMap([all[1]], all)
    expect(l.nodes.map((n) => [n.joke.id, n.dim]).sort()).toEqual([['a', true], ['b', false]])
    expect(l.singles).toEqual([])
  })

  it('puts jokes in no chain in their own list, and draws each chain once', () => {
    const all = [joke('x'), joke('a'), joke('b', 'a'), joke('gone-before', 'trashed')]
    const l = layoutMap(all, all)
    expect(l.singles.map((j) => j.id)).toEqual(['x', 'gone-before'])
    expect(l.nodes).toHaveLength(2)
    expect(l.chains).toBe(1)
  })

  it('survives a loop from an older app', () => {
    const all = [joke('a', 'b'), joke('b', 'a'), joke('c', 'a')]
    const l = layoutMap(all, all)
    expect(new Set(l.nodes.map((n) => n.joke.id))).toEqual(new Set(['a', 'b', 'c']))
  })
})
