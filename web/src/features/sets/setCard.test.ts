import { describe, expect, it } from 'vitest'
import { DEFAULT_FIELDS } from '../../api/setFields'
import type { Beat } from '../../api/types'
import { cardChecks, madeBeforeBeats, shows, showDay } from './setCard'

const config = { fields: DEFAULT_FIELDS, top_up_seconds: 240 }
const beat = (id: string, seconds: number, status?: string, persona?: string): Beat => ({
  id, cue: id, description: '', seconds, shift_reason: '', entries: [],
  labels: { ...(status ? { status } : {}), ...(persona ? { persona } : {}) },
})

describe('cardChecks', () => {
  it('says nothing for a set with no beats', () => {
    expect(cardChecks([], config)).toEqual([])
  })
  it('asks for labels before judging anything', () => {
    expect(cardChecks([beat('a', 60)], config)).toEqual([{ kind: 'info', text: 'Label the beats to see the checks' }])
  })
  it('counts shifts with no reason and a long stretch with no top-up', () => {
    const pills = cardChecks([beat('a', 200, 'i-win'), beat('b', 100, 'i-lose'), beat('c', 300, 'i-win')], config)
    expect(pills.map((p) => p.text)).toContain('2 shifts with no reason')
    expect(pills.map((p) => p.text)).toContain('5:00 with no top-up')
  })
  it('names a persona side that never drives a beat', () => {
    const pills = cardChecks([beat('a', 60, 'i-lose', 'riled-up'), beat('b', 60, 'i-lose', 'bakchod')], config)
    expect(pills.map((p) => p.text)).toContain('No Point prover beat')
  })
})

describe('status filter', () => {
  it('hides Discarded from All, and a set with no status is a Draft', () => {
    expect(shows({ status: 'Discarded' }, 'All')).toBe(false)
    expect(shows({ status: 'Discarded' }, 'Discarded')).toBe(true)
    expect(shows({}, 'Draft')).toBe(true)
  })
  it('writes a show date as a short day', () => {
    expect(showDay('2026-11-28')).toBe('Sat, 28 Nov')
  })
})

describe('madeBeforeBeats', () => {
  it('spots the one beat an older set is read as, and nothing else', () => {
    expect(madeBeforeBeats({ id: 's', items: [] }, [beat('s-beat', 60)].map((b) => ({ ...b, cue: 'Set' })))).toBe(true)
    expect(madeBeforeBeats({ id: 's', items: [] }, [{ ...beat('s-beat', 60), cue: 'Phone' }])).toBe(false)
    expect(madeBeforeBeats({ id: 's', items: [] }, [beat('a', 60), beat('b', 60)])).toBe(false)
  })
})
