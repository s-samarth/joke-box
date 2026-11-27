import { describe, expect, it } from 'vitest'
import { DEFAULT_FIELDS } from '../../api/setFields'
import type { Beat, SetPiece } from '../../api/types'
import { analyse, beatTotal, beatsOf, changeAt, changeNote, flatItems, groupOf, guardMap, needsWhy, skipTarget } from './beats'

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

  it('tells a turn (crossing neutral) from a shift (same side), and asks why only for a turn', () => {
    const beats = [
      beat('a', 60, { status: 'i-lose' }),
      beat('b', 60, { status: 'i-lose' }), // same: neither
      beat('c', 60, { status: 'we-lose' }), // lose to lose: a shift
      beat('d', 60), // Not sure: neither
      beat('e', 60, { status: 'mixed' }), // We lose to Mixed, across the Not sure: a turn (Mixed is above Neutral)
      beat('f', 60, { status: 'i-win' }), // Mixed to I win: a shift
      beat('g', 60, { status: 'neutral' }), // onto neutral: a turn
    ]
    expect(groupOf(beats[4], DEFAULT_FIELDS)).toBe('loss')
    expect(beats.map((_, i) => changeAt(beats, i, DEFAULT_FIELDS))).toEqual([null, null, 'shift', null, 'turn', 'shift', 'turn'])
    expect(beats.map((_, i) => needsWhy(beats, i, DEFAULT_FIELDS))).toEqual([false, false, false, false, true, false, true])
  })

  it('shows a saved reason only where there is a turn', () => {
    // A reason left from before the statuses changed (the bug: "Planned turn" between two I lose beats).
    const stale = [beat('a', 60, { status: 'i-lose' }), beat('b', 60, { status: 'i-lose' }, { shift_reason: 'Planned turn' })]
    expect(changeNote(stale, 1, DEFAULT_FIELDS)).toBeNull()
    const turn = [beat('a', 60, { status: 'i-lose' }), beat('b', 60, { status: 'i-win' }, { shift_reason: 'Planned turn' })]
    expect(changeNote(turn, 1, DEFAULT_FIELDS)).toEqual({ text: 'Turn · Planned', open: false })
    expect(changeNote([turn[0], { ...turn[1], shift_reason: '' }], 1, DEFAULT_FIELDS)).toEqual({ text: 'Turn: why?', open: true })
    expect(changeNote([turn[0], beat('c', 60, { status: 'we-lose' })], 1, DEFAULT_FIELDS)).toEqual({ text: 'Shift', open: false })
  })

  it('without a Neutral option, a win and a loss are the two sides', () => {
    const fields = [{ id: 's', name: 'Status', role: 'status' as const, options: [{ id: 'w', label: 'W', group: 'win' as const }, { id: 'l', label: 'L', group: 'loss' as const }, { id: 'l2', label: 'L2', group: 'loss' as const }] }]
    const beats = [beat('a', 60, { s: 'w' }), beat('b', 60, { s: 'l' }), beat('c', 60, { s: 'l2' })]
    expect(beats.map((_, i) => changeAt(beats, i, fields))).toEqual([null, 'turn', 'shift'])
  })

  it('times the longest stretch with no top-up two ways: Not sure as a top-up, and as none', () => {
    const beats = [
      beat('a', 60, { status: 'i-lose' }),
      beat('b', 100, { status: 'i-win' }),
      beat('c', 100, { status: 'neutral' }),
      beat('d', 50),
      beat('e', 100, { status: 'i-win' }),
      beat('f', 30, { status: 'we-lose' }),
    ]
    const a = analyse(beats, DEFAULT_FIELDS)
    expect(a.known).toEqual({ seconds: 200, span: [60, 260] }) // neutral is not a top-up
    expect(a.possible).toEqual({ seconds: 350, span: [60, 410] }) // Not sure beat d included
    expect(a.statused).toBe(5)
    // Win to neutral is a shift too; a Not sure beat between (d) doesn't hide neutral to win (e).
    expect(a.flips.map((b) => b.id)).toEqual(['b', 'c', 'e', 'f'])
  })

  it('counts persona sides that never drive a beat, and labels left Not sure, by beat', () => {
    const a = analyse([beat('a', 60, { persona: 'bakchod', status: 'gone' }), beat('', 60, { persona: 'gone' })], DEFAULT_FIELDS)
    expect(a.missing).toEqual(['Riled up', 'Point prover'])
    expect(a.personaUnsure.map((b) => b.cue)).toEqual([''])
    // A deleted option reads as Not sure, and a beat with no cue is named by its place.
    expect(a.unsure.map((u) => [u.name, u.fields])).toEqual([['a', ['Status', 'Tone', 'Voice fit']], ['Beat 2', ['Status', 'Dominant persona side', 'Tone', 'Voice fit']]])
  })
})
