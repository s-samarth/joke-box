import { afterEach, describe, expect, it, vi } from 'vitest'
import { ideasScreen, lastIdeas, rememberIdeas } from './ideas'

const store = new Map<string, string>()
const fakeStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }

describe('the Ideas tab', () => {
  afterEach(() => { store.clear(); vi.unstubAllGlobals() })

  it('knows which screen a path is on, open items included', () => {
    expect(ideasScreen('/premises')).toBe('/premises')
    expect(ideasScreen('/premises/abc')).toBe('/premises')
    expect(ideasScreen('/observations/xyz')).toBe('/observations')
    expect(ideasScreen('/premisesque')).toBeNull()
    expect(ideasScreen('/jokes')).toBeNull()
  })

  it('opens on the screen used last, and ignores other screens', () => {
    vi.stubGlobal('localStorage', fakeStorage)
    expect(lastIdeas()).toBe('/premises')
    rememberIdeas('/observations/xyz')
    expect(lastIdeas()).toBe('/observations')
    rememberIdeas('/jokes')
    expect(lastIdeas()).toBe('/observations')
    rememberIdeas('/premises')
    expect(lastIdeas()).toBe('/premises')
  })

  it('falls back to Premises when storage is blocked', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    expect(() => rememberIdeas('/observations')).not.toThrow()
    expect(lastIdeas()).toBe('/premises')
  })
})
