import { describe, expect, it } from 'vitest'
import { DEFAULT_FIELDS } from '../../api/setFields'
import type { Beat } from '../../api/types'
import { setChecks } from './checks'

const config = { fields: DEFAULT_FIELDS, top_up_seconds: 240 }
const beat = (cue: string, seconds: number, status?: string, persona?: string, shift_reason = ''): Beat => ({
  id: cue, cue, description: '', seconds, shift_reason, entries: [],
  labels: { ...(status ? { status } : {}), ...(persona ? { persona } : {}) },
})
const states = (beats: Beat[], c = config) => Object.fromEntries(setChecks(beats, c).checks.map((k) => [k.id, k.state]))
const check = (beats: Beat[], id: string) => setChecks(beats, config).checks.find((k) => k.id === id)!

describe('set checks', () => {
  it('waits for more beats on a one-beat set, whatever its labels', () => {
    expect(states([beat('a', 120)])).toEqual({ shift: 'later', topup: 'later', persona: 'later' })
    expect(states([beat('a', 120, 'i-win', 'bakchod')])).toEqual({ shift: 'later', topup: 'later', persona: 'later' })
    expect(check([beat('a', 120)], 'topup').need).toBe('Applies once the beats add up to more than 4:00. The set is 2:00.')
    expect(check([beat('a', 120)], 'persona').need).toBe('Applies once there are 3 beats, one per side. The set has 1 beat.')
  })

  it('needs two beats with a status before a shift can be judged', () => {
    expect(states([beat('a', 60, 'i-win'), beat('b', 60)]).shift).toBe('label')
    expect(states([beat('a', 60, 'i-win'), beat('b', 60, 'i-lose')]).shift).toBe('warn')
    expect(states([beat('a', 60, 'i-win'), beat('b', 60, 'i-lose', undefined, 'Top-up')]).shift).toBe('ok')
  })

  it('never guesses Not sure on the top-up: too long either way warns, fine either way ticks, else asks', () => {
    // 5:00 of labelled wins: too long even if every Not sure were a top-up.
    expect(check([beat('a', 300, 'i-win'), beat('b', 60)], 'topup')).toMatchObject({ state: 'warn', title: '5:00 with no humility top-up' })
    // Fine even if Not sure is no top-up.
    expect(states([beat('a', 200, 'i-win'), beat('b', 30), beat('c', 60, 'i-lose', undefined, 'Top-up')]).topup).toBe('ok')
    // Wins either side of a Not sure beat: it depends on that beat.
    const open = [beat('a', 150, 'i-win'), beat('Phone', 60), beat('c', 150, 'i-win')]
    expect(check(open, 'topup')).toMatchObject({ state: 'label', need: 'Give Phone a status to check this.' })
  })

  it('asks for persona labels when a missing side could still be on a Not sure beat', () => {
    expect(states([beat('a', 60, 'i-win', 'bakchod'), beat('b', 60, 'i-win', 'riled-up'), beat('c', 60)]).persona).toBe('label')
    expect(check([beat('a', 60, 'i-win', 'bakchod'), beat('b', 60, 'i-win', 'bakchod'), beat('c', 60)], 'persona').state).toBe('warn')
    expect(states([beat('a', 60, 'i-win', 'bakchod'), beat('b', 60, 'i-win', 'riled-up'), beat('c', 60, 'i-win', 'point-prover')]).persona).toBe('ok')
  })

  it('leaves out checks your fields have no role for', () => {
    const fields = DEFAULT_FIELDS.map((f) => ({ ...f, role: null }))
    expect(setChecks([beat('a', 60)], { fields, top_up_seconds: 240 }).checks).toEqual([])
  })
})
