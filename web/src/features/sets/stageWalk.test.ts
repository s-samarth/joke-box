import { describe, expect, it } from 'vitest'
import type { Beat, SetPiece } from '../../api/types'
import { walk } from './stageWalk'

const piece = (id: string, gate = 0): SetPiece => ({ id, joke_id: id, loose: false, gate })
const beat: Beat = {
  id: 'b', cue: 'Fake', description: '', seconds: 60, labels: {}, shift_reason: '',
  entries: [
    { kind: 'premise', id: 'p1', premise_id: null, gate: false, pieces: [piece('a', 2), piece('b', 1), piece('c'), piece('d')] },
    { kind: 'premise', id: 'p2', premise_id: null, gate: true, pieces: [piece('e')] },
  ],
}
const skipped = (answers: Record<string, boolean>) =>
  walk(beat, answers).rows.flatMap((r) => (r.kind === 'piece' && r.skipped ? [r.piece.id] : []))

describe('walking a beat on stage', () => {
  it('asks the first gate first', () => {
    expect(walk(beat, {}).pending).toMatchObject({ key: 'b/p1/a', premise: false })
  })

  it("strikes out what a gate guards when it didn't land, and never asks a struck-out gate", () => {
    expect(skipped({ 'b/p1/a': false })).toEqual(['b', 'c'])
    expect(walk(beat, { 'b/p1/a': false }).pending).toMatchObject({ key: 'b/p2', premise: true })
  })

  it('asks a nested gate once its own gate landed', () => {
    expect(walk(beat, { 'b/p1/a': true }).pending?.key).toBe('b/p1/b')
    expect(skipped({ 'b/p1/a': true, 'b/p1/b': false })).toEqual(['c'])
  })

  it('skips a whole premise gated on the one before', () => {
    expect(skipped({ 'b/p1/a': true, 'b/p1/b': true, 'b/p2': false })).toEqual(['e'])
    expect(walk(beat, { 'b/p1/a': true, 'b/p1/b': true, 'b/p2': true }).pending).toBeNull()
  })
})
