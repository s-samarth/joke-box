import { describe, expect, it } from 'vitest'
import type { Beat, SetEntry, SetPiece } from '../../api/types'
import { moveChoices, moveTo } from './moveTo'

const piece = (id: string, gate = 0): SetPiece => ({ id, joke_id: id, loose: false, gate })
const list = (spec: string) => (spec ? spec.split(' ').map((t) => piece(t[0], Number(t.slice(1)) || 0)) : [])
const show = (pieces: SetPiece[]) => pieces.map((p) => (p.gate ? `${p.id}${p.gate}` : p.id)).join(' ')
const beat = (...entries: SetEntry[]): Beat => ({ id: 'b', cue: '', description: '', seconds: 0, labels: {}, shift_reason: '', entries })
const jokes = (id: string, spec: string): SetEntry => ({ kind: 'jokes', id, pieces: list(spec) })
const premise = (id: string, spec: string): SetEntry => ({ kind: 'premise', id, premise_id: `P${id}`, gate: false, pieces: list(spec) })
const crowd: SetEntry = { kind: 'crowd', id: 'c', title: '', questions: [] }
// A block as kind + premise + jokes, so new blocks (with new ids) read the same.
const shown = (b: Beat) => b.entries.map((e) => (e.kind === 'crowd' ? 'crowd' : `${e.kind === 'premise' ? e.premise_id : 'none'}: ${show(e.pieces)}`))

describe('Move to…', () => {
  it('takes a joke out of its premise on its own, into a new No premise block just below', () => {
    const b = beat(premise('x', 'a b'), crowd)
    expect(shown(moveTo(b, 'b', { alone: true }))).toEqual(['Px: a', 'none: b', 'crowd'])
  })

  it('makes a new block even when a No premise block is right below', () => {
    const b = beat(premise('x', 'a b'), jokes('j', 'c'))
    expect(shown(moveTo(b, 'a', { alone: true }))).toEqual(['Px: b', 'none: a', 'none: c'])
  })

  it('splits a No premise block, so jokes with no premise can sit anywhere', () => {
    expect(shown(moveTo(beat(jokes('j', 'a b c')), 'b', { alone: true }))).toEqual(['none: a c', 'none: b'])
  })

  it('leaves the premise in the beat when its last joke goes', () => {
    expect(shown(moveTo(beat(premise('x', 'a')), 'a', { alone: true }))).toEqual(['Px: ', 'none: a'])
  })

  it('moves into another block, at its end, a gate bringing its jokes', () => {
    const b = beat(premise('x', 'a1 b c'), premise('y', 'd'))
    expect(shown(moveTo(b, 'a', { entryId: 'y' }))).toEqual(['Px: c', 'Py: d a1 b'])
  })

  it('takes a joke out of a gate on the way', () => {
    const b = beat(premise('x', 'a1 b'), jokes('j', 'c'))
    expect(shown(moveTo(b, 'b', { entryId: 'j' }))).toEqual(['Px: a', 'none: c b'])
  })

  it('drops a No premise block that a move empties, never a premise', () => {
    const b = beat(jokes('j', 'a'), premise('x', 'b'))
    expect(shown(moveTo(b, 'a', { entryId: 'x' }))).toEqual(['Px: b a'])
    expect(shown(moveTo(b, 'b', { entryId: 'j' }))).toEqual(['none: a b', 'Px: '])
  })

  it('moves under a premise: its block in the beat, else a new one below', () => {
    const b = beat(jokes('j', 'a b'), premise('y', 'c'))
    expect(shown(moveTo(b, 'a', { premiseId: 'Py' }))).toEqual(['none: b', 'Py: c a'])
    expect(shown(moveTo(b, 'a', { premiseId: 'Pz' }))).toEqual(['none: b', 'Pz: a', 'Py: c'])
  })

  it('does nothing for a move to where it is, or alone when it is already all of its block', () => {
    const b = beat(premise('x', 'a'), jokes('j', 'b'), jokes('k', 'c1 d'))
    expect(moveTo(b, 'a', { entryId: 'x' })).toBe(b)
    expect(moveTo(b, 'a', { premiseId: 'Px' })).toBe(b)
    expect(moveTo(b, 'b', { alone: true })).toBe(b)
    expect(moveTo(b, 'c', { alone: true })).toBe(b)
    expect(moveTo(b, 'zz', { alone: true })).toBe(b)
  })

  it('takes a joke out of a gate into a block of its own', () => {
    expect(shown(moveTo(beat(jokes('j', 'a1 b')), 'b', { alone: true }))).toEqual(['none: a', 'none: b'])
  })

  it('offers No premise, then Under a premise, blocks by number', () => {
    const b = beat(premise('x', 'a'), crowd, jokes('j', ''), premise('y', 'b'))
    const take = (id: string | null) => (id === 'Py' ? 'A take that is far too long to fit on one line of the menu' : undefined)
    const labels = (id: string) => { const g = moveChoices(b, id, take); return [g.none.map((c) => c.label), g.premise.map((c) => c.label)] }
    expect(labels('a')).toEqual([['New block, just below', 'Into 3 · Standalone'], ['Into 4 · A take that is far too long to fit on o…']])
    expect(labels('b')).toEqual([['New block, just below', 'Into 3 · Standalone'], ['Into 1 · Deleted premise']])
    expect(moveChoices(beat(jokes('j', 'a')), 'a', take)).toEqual({ none: [], premise: [] })
  })

  it('names a Standalone block by its title', () => {
    const b = beat(premise('x', 'a'), Object.assign(jokes('j', ''), { title: 'Fake gym bits' }), Object.assign(jokes('k', ''), { title: '  ' }))
    expect(moveChoices(b, 'a', () => undefined).none.map((c) => c.label)).toEqual(['New block, just below', 'Into 2 · Fake gym bits', 'Into 3 · Standalone'])
  })
})
