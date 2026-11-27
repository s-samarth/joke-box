import { describe, expect, it } from 'vitest'
import type { SetPiece } from '../../api/types'
import { addBridge, bridgesOf, dropBridge, spoken, writeBridge } from './bridges'

const joke: SetPiece = { id: 'p1', joke_id: 'j1', loose: false, gate: 0 }

describe('bridges', () => {
  it('reads none on a joke saved before bridges', () => {
    expect(bridgesOf(joke)).toEqual([])
    expect(bridgesOf({ ...joke, bridges: null })).toEqual([])
  })

  it('adds, writes and drops, keeping the joke as it was', () => {
    const one = addBridge(joke)
    const [b] = bridgesOf(one)
    const written = writeBridge(one, b.id, 'Fake bridge')
    expect(written).toMatchObject({ id: 'p1', gate: 0, bridges: [{ id: b.id, text: 'Fake bridge' }] })
    // Removing the last one leaves an empty list: a save clears what's stored.
    expect(dropBridge(written, b.id).bridges).toEqual([])
  })

  it('shows only the bridges with something in them', () => {
    const x = { bridges: [{ id: 'a', text: '  ' }, { id: 'b', text: 'Fake line' }] }
    expect(spoken(x).map((b) => b.id)).toEqual(['b'])
  })
})
