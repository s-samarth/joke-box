import { describe, expect, it } from 'vitest'
import { DEFAULT_FIELDS } from '../../api/setFields'
import type { Beat, SetPiece } from '../../api/types'
import { analyse, beatTotal, beatsOf, flatItems, groupOf, guardMap, needsWhy, skipTarget } from './beats'

const piece = (id: string, extra: Partial<SetPiece> = {}): SetPiece => ({ id, joke_id: id, loose: false, gate: 0, ...extra })
const beat = (id: string, seconds: number, labels: Record<string, string> = {}, extra: Partial<Beat> = {}): Beat =>
  ({ id, cue: id, description: '', seconds, labels, shift_reason: '', entries: [], ...extra })

describe('beats', () => {
  it('reads a set from before beats as one beat of its jokes', () => {
    const items = [{ joke_id: 'a', position: 0, duration_seconds: 60, optional: false }, { joke_id: 'b', position: 1, duration_seconds: 30, optional: true }]
    const [only] = beatsOf({ id: 's', items })
    expect(only.seconds).toBe(60)
    expect(only.entries[0]).toMatchObject({ kind: 'jokes', pieces: [{ joke_id: 'a', loose: false }, { joke_id: 'b', loose: true }] })
  })

  it('lists each joke once, in running order, loose as optional', () => {
    const one = beat('b1', 60, {}, { entries: [{ kind: 'jokes', id: 'e', pieces: [piece('a', { loose: true }), piece('b')] }] })
    const two = beat('b2', 30, {}, { entries: [{ kind: 'premise', id: 'p', premise_id: null, gate: false, pieces: [piece('a'), piece('c')] }] })
    expect(flatItems([one, two]).map((i) => [i.joke_id, i.optional])).toEqual([['a', true], ['b', false], ['c', false]])
    expect(beatTotal([one, two])).toBe(90)
  })

  it('guards the next N jokes behind a gate, never past the end', () => {
    expect(guardMap([piece('a', { gate: 2 }), piece('b'), piece('c'), piece('d')])).toEqual([null, 0, 0, null])
    expect(guardMap([piece('a'), piece('b', { gate: 5 })])).toEqual([null, null])
    // A gate 1, B gate 2, C, D, E: if A doesn't land, B goes and so do C and D, so on to E (#5)
    expect(skipTarget([piece('a', { gate: 1 }), piece('b', { gate: 2 }), piece('c'), piece('d'), piece('e')], 0)).toBe(4)
  })

  it('asks why only when the status group changes', () => {
    const beats = [beat('a', 60, { status: 'i-lose' }), beat('b', 60, { status: 'mixed' }), beat('c', 60, { status: 'i-win' }), beat('d', 60)]
    expect(groupOf(beats[0], DEFAULT_FIELDS)).toBe('loss')
    expect(beats.map((_, i) => needsWhy(beats, i, DEFAULT_FIELDS))).toEqual([false, false, true, false])
  })

  it('times the longest stretch with no top-up; neutral is not a top-up, Not sure carries a run on', () => {
    const beats = [
      beat('a', 60, { status: 'i-lose' }),
      beat('b', 100, { status: 'i-win' }),
      beat('c', 100, { status: 'neutral' }),
      beat('d', 50),
      beat('e', 100, { status: 'i-win' }),
      beat('f', 30, { status: 'we-lose' }),
    ]
    const a = analyse(beats, DEFAULT_FIELDS)
    expect(a.longest).toBe(350) // the whole shaded stretch, Not sure beat d included
    expect(a.worst).toEqual([60, 410])
    // Win to neutral is a shift too; a Not sure beat between (d) doesn't hide neutral to win (e).
    expect(a.flips.map((b) => b.id)).toEqual(['b', 'c', 'e', 'f'])
  })

  it('counts persona sides that never drive a beat, and labels left Not sure', () => {
    const a = analyse([beat('a', 60, { persona: 'bakchod', status: 'gone' })], DEFAULT_FIELDS)
    expect(a.missing).toEqual(['Riled up', 'Point prover'])
    // A deleted option reads as Not sure.
    expect(a.unsure).toEqual(['a: Status', 'a: Tone', 'a: Voice fit'])
  })
})
