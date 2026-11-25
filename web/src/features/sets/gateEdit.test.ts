import { describe, expect, it } from 'vitest'
import type { SetPiece } from '../../api/types'
import { addToGate, canGate, canStep, stepJoke, toggleGate } from './gateEdit'
import { fitGates, piecesOf, rowsOf } from './gateRows'

const piece = (id: string, gate = 0): SetPiece => ({ id, joke_id: id, loose: false, gate })
const list = (spec: string) => spec.split(' ').map((t) => piece(t[0], Number(t.slice(1)) || 0))
const show = (pieces: SetPiece[]) => pieces.map((p) => (p.gate ? `${p.id}${p.gate}` : p.id)).join(' ')

describe('gates as boxes', () => {
  it('reads a list as rows, with gates holding their jokes, and back', () => {
    const pieces = list('a b3 c d1 e f')
    const rows = rowsOf(pieces)
    expect(rows.map((r) => r.piece.id)).toEqual(['a', 'b', 'f'])
    expect(rows[1].guarded.map((r) => r.piece.id)).toEqual(['c', 'd'])
    expect(rows[1].guarded[1].guarded.map((r) => r.piece.id)).toEqual(['e'])
    expect(show(piecesOf(rows))).toBe('a b3 c d1 e f')
  })

  it('widens a gate over an inner gate that ran past it, so nothing guarded is let go', () => {
    expect(show(fitGates(list('a1 b2 c d e')))).toBe('a3 b2 c d e')
  })

  it('folds a third level of gate into the gate it sits in', () => {
    expect(show(fitGates(list('a4 b3 c2 d e f')))).toBe('a4 b3 c d e f')
  })

  it('keeps gates inside their list', () => {
    expect(show(fitGates(list('a b5 c')))).toBe('a b1 c')
  })

  it('makes a gate over the joke under it, with its gate, and lets it go in place', () => {
    expect(show(toggleGate(list('a b c'), 'a'))).toBe('a1 b c')
    expect(show(toggleGate(list('a b1 c d'), 'a'))).toBe('a2 b1 c d')
    expect(show(toggleGate(list('a2 b1 c d'), 'a'))).toBe('a b1 c d')
    expect(show(toggleGate(list('a b'), 'b'))).toBe('a b')
  })

  it('stops at two levels of gate', () => {
    expect(canGate(list('a2 b c'), 'b')).toBe(true)
    expect(canGate(list('a3 b2 c d'), 'c')).toBe(false)
    expect(canGate(list('a c1 d'), 'a')).toBe(true)
    expect(canGate(list('a b2 c1 d'), 'a')).toBe(false)
    expect(show(toggleGate(list('a3 b2 c d'), 'c'))).toBe('a3 b2 c d')
  })

  it('adds jokes straight into a gate, at its end', () => {
    expect(show(addToGate(list('a1 b c'), 'a', [piece('x'), piece('y')]))).toBe('a3 b x y c')
    expect(show(addToGate(list('a2 b1 c d'), 'b', [piece('x')]))).toBe('a3 b2 c x d')
  })
})

describe('the arrows', () => {
  const up = (spec: string, id: string) => show(stepJoke(list(spec), id, -1))
  const down = (spec: string, id: string) => show(stepJoke(list(spec), id, 1))

  it('swaps with plain jokes, and stops at the ends of the list', () => {
    expect(up('a b c', 'b')).toBe('b a c')
    expect(down('a b c', 'b')).toBe('a c b')
    expect(canStep(list('a b'), 'a', -1)).toBe(false)
    expect(canStep(list('a b'), 'b', 1)).toBe(false)
  })

  it('walks into a gate: at its end going up, at its top going down', () => {
    expect(up('a2 b c d', 'd')).toBe('a3 b c d')
    expect(down('x a1 b', 'x')).toBe('a2 x b')
  })

  it('walks out of a gate at its edges', () => {
    expect(up('a2 b c d', 'b')).toBe('b a1 c d')
    expect(down('a2 b c d', 'c')).toBe('a1 b c d')
    expect(down('a1 b c', 'b')).toBe('a b c')
  })

  it('goes one level at a time into an inner gate, and past one it would make too deep', () => {
    expect(up('a3 b1 c d e', 'e')).toBe('a4 b1 c d e')
    expect(up('a4 b1 c d e', 'e')).toBe('a4 b1 c e d')
    expect(up('a4 b1 c e d', 'e')).toBe('a4 b2 c e d')
    expect(up('a2 b1 c d1 e', 'd')).toBe('a4 b1 c d1 e')
    expect(up('a4 b1 c d1 e', 'd')).toBe('a4 d1 e b1 c')
  })

  it('moves a gate with all it holds', () => {
    expect(up('x a1 b', 'a')).toBe('a1 b x')
    expect(down('a1 b x', 'a')).toBe('x a1 b')
  })
})
