import { describe, expect, it } from 'vitest'
import { CARD, WEB_NODE, layoutWebs } from './webLayout'
import { placeWeb, slotSpot, slotsOn } from './webRings'

type Box = { x: number; y: number; w: number; h: number }
const overlap = (a: Box, b: Box) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2

function noOverlaps(centres: { x: number; y: number }[]) {
  const boxes: Box[] = [{ x: 0, y: 0, ...CARD }, ...centres.map((c) => ({ ...c, ...WEB_NODE }))]
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) expect(overlap(boxes[i], boxes[j]), `${i} and ${j}`).toBe(false)
  }
}

/** n jokes, where every third one follows the joke before it, and some branch. */
const jokes = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `j${i}`, follows_id: i % 3 ? `j${i - (i % 5 === 4 ? 2 : 1)}` : null }))

describe('ring slots', () => {
  it('never overlap each other or the premise card, six rings deep', () => {
    const all = [1, 2, 3, 4, 5, 6].flatMap((k) => Array.from({ length: slotsOn(k) }, (_, i) => slotSpot(k, i)))
    noOverlaps(all)
  })
})

describe('placeWeb', () => {
  it('puts every joke on its own slot, chains or not', () => {
    for (let n = 1; n <= 60; n++) {
      for (const list of [jokes(n), jokes(n).map((j) => ({ ...j, follows_id: null }))]) {
        const at = placeWeb(list)
        expect(at.size).toBe(n)
        noOverlaps([...at.values()])
      }
    }
  })

  it('starts at the top and puts a follower further out, in line with the joke before', () => {
    const at = placeWeb([{ id: 'a' }, { id: 'b', follows_id: 'a' }])
    expect(at.get('a')).toEqual({ x: 0, y: -260 })
    expect(at.get('b')!.y).toBeLessThan(-260)
  })
})

describe('layoutWebs', () => {
  const premises = [{ id: 'p1', topic_id: 'b' }, { id: 'p2', topic_id: 'a' }, { id: 'p3', topic_id: 'a' }]
  const all = [
    { id: 'j1', premise_id: 'p1', created_at: '1' },
    { id: 'j2', premise_id: 'p1', follows_id: 'j1', created_at: '2' },
    { id: 'j3', premise_id: 'p2', created_at: '3' },
  ]

  it('orders webs by topic, dims what the filters hide, and points the premise only at chain starts', () => {
    const { webs } = layoutWebs([all[0]], all, premises, ['a', 'b'], true)
    expect(webs.map((w) => w.premise.id)).toEqual(['p2', 'p3', 'p1'])
    expect(webs[2].nodes.map((n) => [n.joke.id, n.dim])).toEqual([['j1', false], ['j2', true]])
    expect(webs[2].lines.map((l) => [l.kind, l.key])).toEqual([['spoke', 'sj1'], ['chain', 'cj2']])
  })

  it('leaves out premises with nothing shown while filtering', () => {
    expect(layoutWebs([all[2]], all, premises, ['a', 'b'], false).webs.map((w) => w.premise.id)).toEqual(['p2'])
  })
})
