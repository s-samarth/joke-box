import { describe, expect, it } from 'vitest'
import { DEFAULT_FIELDS } from '../../api/setFields'
import type { Beat, Joke } from '../../api/types'
import { optionUsage, usageText } from './fieldUsage'

const [, persona, tone] = DEFAULT_FIELDS
const beat = (labels: Record<string, string>): Beat => ({ id: crypto.randomUUID(), cue: '', description: '', seconds: 60, shift_reason: '', entries: [], labels })
const joke = (p: string | null) => ({ id: crypto.randomUUID(), persona: p }) as Joke

describe('optionUsage', () => {
  const sets = [
    { beats: [beat({ tone: 'edgy' }), beat({ tone: 'edgy', persona: 'bakchod' }), beat({})] },
    { beats: [beat({ tone: 'playful' })] },
    { beats: [beat({ tone: 'edgy' })] },
    {},
  ]
  it('counts beats and the sets they are in', () => {
    expect(optionUsage(tone, ['edgy'], sets, [])).toEqual({ beats: 3, sets: 2, jokes: 0 })
    expect(usageText(optionUsage(tone, ['edgy'], sets, []))).toBe('3 beats in 2 sets')
  })
  it('counts jokes only for the persona field', () => {
    const jokes = [joke('bakchod'), joke('bakchod'), joke(null), joke('riled-up')]
    expect(optionUsage(persona, ['bakchod'], sets, jokes)).toEqual({ beats: 1, sets: 1, jokes: 2 })
    expect(usageText(optionUsage(persona, ['bakchod'], sets, jokes))).toBe('1 beat in 1 set and 2 jokes')
    expect(optionUsage(tone, ['bakchod'], sets, jokes).jokes).toBe(0)
  })
  it('counts a whole field by all its options, and says nothing when unused', () => {
    expect(optionUsage(tone, tone.options.map((o) => o.id), sets, []).beats).toBe(4)
    expect(usageText(optionUsage(tone, ['heartfelt'], sets, []))).toBe('')
  })
})
