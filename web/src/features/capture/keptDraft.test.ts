import { beforeEach, describe, expect, it, vi } from 'vitest'
import { forgetDraft, hasText, keepDraft, keptDraft, startDraft, type KeptDraft } from './keptDraft'
import { blankJoke } from './newJoke'

/** Node before 25 has no localStorage (CI runs 22), so the tests bring an in-memory one. */
function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() { return data.size },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => { data.delete(k) },
    setItem: (k, v) => { data.set(k, String(v)) },
  }
}

const typed: KeptDraft = { draft: { ...blankJoke('t1'), setup: 'A made-up setup about a fake landlord' }, brainstorm: '' }

describe('the kept New joke draft', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()))

  it('survives being put away and is gone once forgotten', () => {
    keepDraft(typed)
    expect(keptDraft()).toEqual(typed)
    forgetDraft()
    expect(keptDraft()).toBeNull()
  })

  it('counts only typed text, not the default details', () => {
    expect(hasText({ draft: blankJoke('t1'), brainstorm: '' })).toBe(false)
    expect(hasText({ draft: { ...blankJoke(), tag_lines: ['  '] }, brainstorm: '' })).toBe(false)
    expect(hasText({ draft: blankJoke(), brainstorm: 'an angle' })).toBe(true)
    expect(hasText(typed)).toBe(true)
  })

  it('comes back when New joke is opened plainly', () => {
    const start = startDraft(blankJoke(), true, typed)
    expect(start).toMatchObject({ ...typed, restored: true, owns: true })
  })

  it('is left alone by a sheet opened for something else', () => {
    const fromObservation = { ...blankJoke(), setup: 'A made-up observation' }
    expect(startDraft(fromObservation, false, typed)).toMatchObject({ draft: fromObservation, restored: false, owns: false })
    expect(startDraft(fromObservation, false, null)).toMatchObject({ restored: false, owns: true })
  })

  it('treats blocked or broken storage as nothing kept', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } })
    expect(() => keepDraft(typed)).not.toThrow()
    expect(keptDraft()).toBeNull()
    expect(() => forgetDraft()).not.toThrow()
    vi.stubGlobal('localStorage', memoryStorage())
    localStorage.setItem('jokebox.newJokeDraft', '{not json')
    expect(keptDraft()).toBeNull()
  })
})
