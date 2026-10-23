import { describe, expect, it } from 'vitest'
import { CELL, layoutBoard, spotIn, type Spot } from './boardLayout'
import { NODE } from './mapLayout'

const joke = (id: string, topic_id: string, follows_id: string | null = null) => ({ id, topic_id, follows_id, created_at: `2026-01-01T00:00:0${id.length}` })
const none = new Map<string, Spot>()
const box = (b: ReturnType<typeof layoutBoard>, id: string) => b.boxes.find((x) => x.joke.id === id)!
const overlap = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) < NODE.w && Math.abs(a.y - b.y) < NODE.h

describe('joke board layout', () => {
  const all = [joke('a', 'cars'), joke('b', 'cars', 'a'), joke('c', 'cars', 'b'), joke('d', 'food'), joke('e', 'cars'), joke('f', 'food', 'a')]

  it('makes an island per topic, in your topic order', () => {
    const b = layoutBoard(all, all, ['food', 'cars'], none)
    expect(b.islands.map((i) => i.topicId)).toEqual(['food', 'cars'])
    expect(b.islands[0].x).toBe(0)
  })

  it("keeps a chain together in its first joke's island, with an arrow per link", () => {
    const b = layoutBoard(all, all, ['cars', 'food'], none)
    expect(box(b, 'f').island).toBe('cars')
    expect(new Set(['a', 'b', 'c', 'f'].map((id) => box(b, id).chain))).toEqual(new Set([0]))
    expect(b.edges.map((e) => `${e.from}>${e.to}`).sort()).toEqual(['a>b', 'a>f', 'b>c'])
    expect(box(b, 'e').chain).toBeNull()
  })

  it('never overlaps boxes, and lays out the same way every time', () => {
    const many = Array.from({ length: 40 }, (_, i) => joke(`j${i}`, 't'))
    const b = layoutBoard(many, many, ['t'], none)
    for (const x of b.boxes) for (const y of b.boxes) if (x !== y) expect(overlap(x, y)).toBe(false)
    expect(layoutBoard(many, many, ['t'], none).boxes).toEqual(b.boxes)
  })

  it('puts a moved joke where you left it, and keeps the grid off it', () => {
    const spots = new Map<string, Spot>([['e', { topic_id: 'cars', x: 0, y: 0 }]])
    const b = layoutBoard(all, all, ['cars', 'food'], spots)
    const island = b.islands.find((i) => i.topicId === 'cars')!
    expect([box(b, 'e').x, box(b, 'e').y]).toEqual([island.origin.x, island.origin.y])
    expect(box(b, 'e').pinned).toBe(true)
    for (const id of ['a', 'b', 'c', 'f']) expect(overlap(box(b, id), box(b, 'e'))).toBe(false)
    expect(spotIn(island, island.origin.x + 30.4, island.origin.y - 50)).toEqual({ topic_id: 'cars', x: 30, y: 0 })
  })

  it('ignores a spot from before the joke changed topic', () => {
    const spots = new Map<string, Spot>([['d', { topic_id: 'cars', x: 900, y: 900 }]])
    const b = layoutBoard(all, all, ['cars', 'food'], spots)
    expect(box(b, 'd').pinned).toBe(false)
  })

  it('wraps islands onto a new row and dims jokes the filters hide', () => {
    const b = layoutBoard([all[1], all[3]], all, ['cars', 'food'], none, CELL.w)
    expect(b.islands[1].y).toBeGreaterThan(0)
    expect(box(b, 'a').dim).toBe(true)
    expect(box(b, 'b').dim).toBe(false)
  })
})
