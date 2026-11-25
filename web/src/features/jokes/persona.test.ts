import { describe, expect, it } from 'vitest'
import { DEFAULT_FIELDS } from '../../api/setFields'
import type { Joke } from '../../api/types'
import { personaFieldOf, personaLabel } from './persona'
import { matchesPersona, PERSONA_NOT_SURE } from './useJokeFilters'

const field = personaFieldOf(DEFAULT_FIELDS)!
const known = new Set(field.options.map((o) => o.id))
const joke = (persona?: string | null) => ({ persona }) as Joke

describe("a joke's persona", () => {
  it('is the persona field (Dominant persona side), and reads by its option name', () => {
    expect(field.name).toBe('Dominant persona side')
    expect(personaLabel('bakchod', field)).toBe('Bakchod')
  })
  it('is Not sure when unset, deleted, or there is no persona field', () => {
    expect(personaLabel(null, field)).toBeNull()
    expect(personaLabel('gone', field)).toBeNull()
    expect(personaLabel('bakchod', undefined)).toBeNull()
  })
  it('filters by side, and Not sure takes in unset and deleted ones', () => {
    expect(matchesPersona(joke('bakchod'), 'bakchod', known)).toBe(true)
    expect(matchesPersona(joke('riled-up'), 'bakchod', known)).toBe(false)
    expect(matchesPersona(joke(undefined), PERSONA_NOT_SURE, known)).toBe(true)
    expect(matchesPersona(joke('gone'), PERSONA_NOT_SURE, known)).toBe(true)
    expect(matchesPersona(joke('bakchod'), PERSONA_NOT_SURE, known)).toBe(false)
    expect(matchesPersona(joke('gone'), null, known)).toBe(true)
  })
})
