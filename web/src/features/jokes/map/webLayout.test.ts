import { describe, expect, it } from 'vitest'
import { CARD, WEB_NODE, layoutWebs, ringSpots } from './webLayout'

type Box = { x: number; y: number; w: number; h: number }
const overlap = (a: Box, b: Box) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2

describe('ringSpots', () => {
  it('never overlaps a joke with another or with the premise card', () => {
    for (let n = 1; n <= 120; n++) {
      const boxes: Box[] = [{ x: 0, y: 0, ...CARD }, ...ringSpots(n).map((s) => ({ ...s, ...WEB_NODE }))]
      expect(boxes.length).toBe(n + 1)
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) expect(overlap(boxes[i], boxes[j]), `n=${n}: ${i} and ${j}`).toBe(false)
      }
    }
  })

  it('starts at the top', () => {
    expect(ringSpots(1)).toEqual([{ x: 0, y: -260 }])
  })
})

describe('layoutWebs', () => {
  const premises = [{ id: 'p1', topic_id: 'b' }, { id: 'p2', topic_id: 'a' }, { id: 'p3', topic_id: 'a' }]
  const all = [
    { id: 'j1', premise_id: 'p1', created_at: '1' },
    { id: 'j2', premise_id: 'p1', follows_id: 'j1', created_at: '2' },
    { id: 'j3', premise_id: 'p2', created_at: '3' },
  ]

  it('orders webs by topic and dims jokes the filters hide', () => {
    const { webs } = layoutWebs([all[0]], all, premises, ['a', 'b'], true)
    expect(webs.map((w) => w.premise.id)).toEqual(['p2', 'p3', 'p1'])
    expect(webs[2].nodes.map((n) => [n.joke.id, n.dim])).toEqual([['j1', false], ['j2', true]])
    expect(webs[2].lines.map((l) => l.kind)).toEqual(['spoke', 'spoke', 'chain'])
  })

  it('leaves out premises with nothing shown while filtering', () => {
    expect(layoutWebs([all[2]], all, premises, ['a', 'b'], false).webs.map((w) => w.premise.id)).toEqual(['p2'])
  })
})
