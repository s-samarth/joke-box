import { describe, expect, it } from 'vitest'
import type { Beat, Joke, SetPiece } from '../../api/types'
import { addLoose, addPiecesTo, clampGates, groupUnder, pieceFor, stepGate, swap, tidyEntries, toggleGate, togglePin } from './beatEdit'

const piece = (id: string, extra: Partial<SetPiece> = {}): SetPiece => ({ id, joke_id: id, loose: false, gate: 0, ...extra })

describe('editing beats', () => {
  it('turns a gate on over the next joke, and steps it within the jokes left', () => {
    const list = [piece('a'), piece('b'), piece('c')]
    expect(toggleGate(list, 0)[0].gate).toBe(1)
    expect(toggleGate(list, 2)[2].gate).toBe(0)
    expect(stepGate(toggleGate(list, 0), 0, 1)[0].gate).toBe(2)
    expect(stepGate(stepGate(toggleGate(list, 0), 0, 1), 0, 1)[0].gate).toBe(2)
    expect(stepGate(toggleGate(list, 0), 0, -1)[0].gate).toBe(1)
  })

  it('keeps gates inside their list after a move', () => {
    const moved = clampGates(swap([piece('a', { gate: 1 }), piece('b')], 0, 1))
    expect(moved.map((p) => [p.id, p.gate])).toEqual([['b', 0], ['a', 0]])
  })

  it('never gates the first premise of a beat', () => {
    const first = { kind: 'premise' as const, id: 'p1', premise_id: null, gate: true, pieces: [] }
    const second = { ...first, id: 'p2' }
    expect(tidyEntries([first, second]).map((e) => e.kind === 'premise' && e.gate)).toEqual([false, true])
  })

  it('follows a cluster lead when adding the lead, and pins any other version', () => {
    const joke = (id: string) => ({ id, cluster_id: 'c' }) as Joke
    const lead = () => 'lead'
    expect(pieceFor(joke('lead'), lead).pinned).toBe(false)
    expect(pieceFor(joke('other'), lead).pinned).toBe(true)
    expect(togglePin(piece('other', { cluster_id: 'c', pinned: true }), 'lead')).toMatchObject({ pinned: false, joke_id: 'lead' })
  })

  it('adds jokes with no premise to the last list, or a new one after a premise', () => {
    const beat: Beat = { id: 'b', cue: '', description: '', seconds: 0, labels: {}, shift_reason: '', entries: [] }
    const one = addLoose(beat, [piece('a')])
    const two = addLoose(one, [piece('b')])
    expect(two.entries).toHaveLength(1)
    expect(two.entries[0].kind === 'jokes' && two.entries[0].pieces.map((p) => p.id)).toEqual(['a', 'b'])
  })
})

describe('adding jokes into a beat', () => {
  it('starts a new no-premise list when there is no target, then keeps adding to it', () => {
    const beat: Beat = { id: 'b', cue: '', description: '', seconds: 0, labels: {}, shift_reason: '', entries: [{ kind: 'premise', id: 'p', premise_id: null, gate: false, pieces: [] }] }
    const first = addPiecesTo(beat, null, [piece('a')])
    const second = addPiecesTo(first.beat, first.entryId, [piece('b')])
    expect(second.beat.entries.map((e) => e.kind)).toEqual(['premise', 'jokes'])
    const into = addPiecesTo(second.beat, 'p', [piece('c')])
    expect(into.beat.entries[0].kind === 'premise' && into.beat.entries[0].pieces.map((p) => p.id)).toEqual(['c'])
  })
})

describe('putting loose jokes under a premise', () => {
  const beat = (entries: Beat['entries']): Beat => ({ id: 'b', cue: '', description: '', seconds: 0, labels: {}, shift_reason: '', entries })
  const ids = (b: Beat) => b.entries.map((e) => (e.kind === 'crowd' ? e.kind : `${e.kind === 'premise' ? e.premise_id : 'none'}:${e.pieces.map((p) => p.id).join('')}`))

  it('puts a new premise above the list with the picked jokes in their order, settings kept', () => {
    const out = groupUnder(beat([{ kind: 'jokes', id: 'j', pieces: [piece('a'), piece('b', { loose: true }), piece('c')] }]), 'j', ['c', 'b'], 'P')
    expect(ids(out)).toEqual(['P:bc', 'none:a'])
    expect(out.entries[0].kind === 'premise' && out.entries[0].pieces[0].loose).toBe(true)
  })

  it('joins a premise the beat already has, and drops a list left empty', () => {
    const out = groupUnder(beat([{ kind: 'premise', id: 'p', premise_id: 'P', gate: false, pieces: [piece('x')] }, { kind: 'jokes', id: 'j', pieces: [piece('a'), piece('b')] }]), 'j', ['a', 'b'], 'P')
    expect(ids(out)).toEqual(['P:xab'])
  })

  it('keeps a gate inside the jokes it ends up with', () => {
    const out = groupUnder(beat([{ kind: 'jokes', id: 'j', pieces: [piece('a'), piece('b', { gate: 1 }), piece('c')] }]), 'j', ['b'], 'P')
    expect(out.entries[0].kind === 'premise' && out.entries[0].pieces[0].gate).toBe(0)
  })

  it('leaves the beat alone for a premise entry or nothing picked', () => {
    const start = beat([{ kind: 'premise', id: 'p', premise_id: 'Q', gate: false, pieces: [piece('a')] }])
    expect(groupUnder(start, 'p', ['a'], 'P')).toBe(start)
    expect(groupUnder(beat([{ kind: 'jokes', id: 'j', pieces: [piece('a')] }]), 'j', [], 'P').entries).toHaveLength(1)
  })
})
