import { describe, expect, it } from 'vitest'
import type { Beat, SetEntry, SetPiece } from '../../api/types'
import { moveEntry, moveJoke, movedLists, spotOf } from './beatMove'

const piece = (id: string, gate = 0): SetPiece => ({ id, joke_id: id, loose: false, gate })
const list = (spec: string) => spec.split(' ').map((t) => piece(t[0], Number(t.slice(1)) || 0))
const show = (pieces: SetPiece[]) => pieces.map((p) => (p.gate ? `${p.id}${p.gate}` : p.id)).join(' ')
const beat = (...entries: SetEntry[]): Beat => ({ id: 'b', cue: '', description: '', seconds: 0, labels: {}, shift_reason: '', entries })
const jokes = (id: string, spec: string): SetEntry => ({ kind: 'jokes', id, pieces: list(spec) })
const premise = (id: string, spec: string): SetEntry => ({ kind: 'premise', id, premise_id: id, gate: false, pieces: spec ? list(spec) : [] })
const shown = (b: Beat) => b.entries.map((e) => (e.kind === 'crowd' ? e.id : `${e.id}: ${show(e.pieces)}`))

describe('dragging jokes', () => {
  it('reorders inside a list, a gate bringing its jokes', () => {
    const b = beat(jokes('j', 'a b1 c d'))
    expect(shown(moveJoke(b, 'b', { entryId: 'j', gateId: null, index: 0 }))).toEqual(['j: b1 c a d'])
    expect(shown(moveJoke(b, 'a', { entryId: 'j', gateId: null, index: 2 }))).toEqual(['j: b1 c d a'])
  })

  it('puts a joke into a gate, takes one out, and dissolves a gate left empty', () => {
    const b = beat(jokes('j', 'a1 b c'))
    expect(shown(moveJoke(b, 'c', { entryId: 'j', gateId: 'a', index: 0 }))).toEqual(['j: a2 c b'])
    expect(shown(moveJoke(b, 'b', { entryId: 'j', gateId: null, index: 2 }))).toEqual(['j: a c b'])
  })

  it('reorders inside a gate', () => {
    const b = beat(jokes('j', 'a3 b c d e'))
    expect(shown(moveJoke(b, 'd', { entryId: 'j', gateId: 'a', index: 0 }))).toEqual(['j: a3 d b c e'])
  })

  it('moves a joke or a whole gate into another list', () => {
    const b = beat(premise('p', 'a1 b'), jokes('j', 'c'))
    expect(shown(moveJoke(b, 'a', { entryId: 'j', gateId: null, index: 1 }))).toEqual(['p: ', 'j: c a1 b'])
    expect(shown(moveJoke(b, 'c', { entryId: 'p', gateId: 'a', index: 1 }))).toEqual(['p: a2 b c', 'j: '])
  })

  it('never puts a gate inside itself, or deeper than two levels', () => {
    const b = beat(jokes('j', 'a2 b1 c d1 e'))
    expect(moveJoke(b, 'a', { entryId: 'j', gateId: 'b', index: 0 })).toBe(b)
    expect(moveJoke(b, 'd', { entryId: 'j', gateId: 'b', index: 0 })).toBe(b)
    expect(shown(moveJoke(b, 'd', { entryId: 'j', gateId: 'a', index: 1 }))).toEqual(['j: a4 b1 c d1 e'])
  })

  it('says where a joke is', () => {
    const b = beat(jokes('j', 'a2 b1 c d'))
    expect(spotOf(b, 'c')).toEqual({ entryId: 'j', gateId: 'b', index: 0 })
    expect(spotOf(b, 'd')).toEqual({ entryId: 'j', gateId: null, index: 1 })
  })

  it('names the jokes that changed list', () => {
    const b = beat(premise('p', 'a'), jokes('j', 'c'))
    expect([...movedLists(b, moveJoke(b, 'c', { entryId: 'p', gateId: null, index: 0 }))]).toEqual([['c', 'p']])
  })
})

describe('dragging blocks', () => {
  it('moves a block to its new place', () => {
    const entries = [premise('p', ''), jokes('j', 'a'), { kind: 'crowd' as const, id: 'c', title: '', questions: [] }]
    expect(moveEntry(entries, 'c', 0).map((e) => e.id)).toEqual(['c', 'p', 'j'])
    expect(moveEntry(entries, 'p', 2).map((e) => e.id)).toEqual(['j', 'c', 'p'])
    expect(moveEntry(entries, 'p', 5)).toBe(entries)
  })
})
