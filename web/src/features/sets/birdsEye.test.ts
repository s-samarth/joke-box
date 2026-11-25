import { describe, expect, it } from 'vitest'
import type { Beat, SetEntry, SetPiece } from '../../api/types'
import { clampZoom, depths, numbers, scaleFor, starts, stripLayout, ticks } from './birdsEye'

const piece = (id: string, gate = 0, loose = false): SetPiece => ({ id, joke_id: `j-${id}`, gate, loose })
const jokes = (id: string, ...pieces: SetPiece[]): SetEntry => ({ kind: 'jokes', id, pieces })
const premise = (id: string, ...pieces: SetPiece[]): SetEntry => ({ kind: 'premise', id, premise_id: null, gate: false, pieces })
const crowd = (id: string, questions: number): SetEntry => ({
  kind: 'crowd', id, title: '', questions: Array.from({ length: questions }, (_, i) => ({ id: `${id}q${i}`, text: 'Fake question', has_reply: false, replies: [] })),
})
const beat = (id: string, seconds: number, ...entries: SetEntry[]): Beat => ({ id, cue: id, description: '', seconds, labels: {}, shift_reason: '', entries })

describe('numbers and starts', () => {
  it('numbers jokes in running order across beats, skipping crowd work', () => {
    const beats = [beat('a', 60, premise('p', piece('1'), piece('2')), crowd('c', 2)), beat('b', 30, jokes('s', piece('3')))]
    expect([...numbers(beats)]).toEqual([['1', 1], ['2', 2], ['3', 3]])
    expect(starts(beats)).toEqual([0, 60])
  })
})

describe('depths', () => {
  it('counts the gates around each joke, as the builder fits them', () => {
    expect(depths([piece('g', 3), piece('a'), piece('h', 1), piece('b'), piece('c')])).toEqual([0, 1, 1, 2, 0])
    // A gate that runs past its outer gate widens it, so the joke after is still inside.
    expect(depths([piece('g', 1), piece('h', 1), piece('b')])).toEqual([0, 1, 2])
  })
})

describe('stripLayout', () => {
  const beats = [
    beat('a', 120, premise('p', piece('1', 1), piece('2')), crowd('c', 1), jokes('s', piece('3'))),
    beat('b', 60),
  ]
  const strip = stripLayout(beats, 300, 2, numbers(beats))

  it('sizes beats by their own time, to the slot', () => {
    expect(strip.width).toBe(600)
    expect(strip.beats.map((b) => [b.x, b.w, b.start])).toEqual([[0, 240, 0], [240, 120, 120]])
  })

  it('gives blocks and jokes equal slots in order, never time of their own', () => {
    // 2 jokes + 1 question + 1 joke = 4 equal slots of 60px in a 240px beat.
    expect(strip.blocks.map((b) => [b.entry.id, b.x, b.w])).toEqual([['p', 0, 120], ['c', 120, 60], ['s', 180, 60]])
    expect(strip.blocks[0].marks.map((m) => m.x)).toEqual([30, 90])
    expect(strip.blocks[1].marks[0].question).toBe('Fake question')
  })

  it('brackets a gate from its joke to the last it guards', () => {
    expect(strip.blocks[0].spans).toEqual([{ key: '1', from: 30, to: 90, depth: 0, n: 1 }])
  })

  it('runs past the slot when the beats do, and copes with an empty beat', () => {
    const long = stripLayout([beat('x', 400)], 300, 1, new Map())
    expect(long.width).toBe(400)
    expect(long.blocks).toEqual([])
  })
})

describe('scale and zoom', () => {
  it('ticks every minute, or every five when minutes crowd together', () => {
    expect(ticks(180, 1)).toEqual([0, 60, 120, 180])
    expect(ticks(900, 0.5)).toEqual([0, 300, 600, 900])
  })

  it('matches the board width, never narrower than the minimum', () => {
    expect(scaleFor(1200, 600)).toBe(2)
    expect(scaleFor(300, 360)).toBe(2)
    expect(scaleFor(300, 0)).toBe(1)
  })

  it('keeps zoom between a quarter and three times', () => {
    expect(clampZoom(0.1)).toBe(0.25)
    expect(clampZoom(9)).toBe(3)
    expect(clampZoom(1.234)).toBe(1.23)
  })
})
