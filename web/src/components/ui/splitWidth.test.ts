import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SHARE, listBounds, saveShare, savedShare, shareFor, widthFor } from './splitWidth'

describe('the list in a wide split', () => {
  it('can take the open item’s empty margins, never its width', () => {
    // 1664px split: the pane needs 48rem (768px), so the list runs 416px to 896px.
    expect(listBounds(1664)).toEqual({ min: 416, max: 896 })
    expect(widthFor(1, listBounds(1664))).toBe(896)
    expect(widthFor(0, listBounds(1664))).toBe(416)
  })
  it('starts with half the spare room', () => {
    expect(widthFor(DEFAULT_SHARE, listBounds(1664))).toBe(656)
  })
  it('stays at its narrowest when there’s nothing to spare', () => {
    expect(listBounds(1100)).toEqual({ min: 416, max: 416 })
    expect(widthFor(0.8, listBounds(1100))).toBe(416)
    expect(shareFor(500, listBounds(1100))).toBe(0)
  })
  it('turns a dragged width into a share, within bounds', () => {
    const b = listBounds(1664)
    expect(shareFor(656, b)).toBe(0.5)
    expect(shareFor(2000, b)).toBe(1)
    expect(shareFor(100, b)).toBe(0)
  })
})

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

describe('the remembered width', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()))

  it('is kept per list, and reset goes back to the default', () => {
    saveShare('joke', 0.8)
    expect(savedShare('joke')).toBe(0.8)
    expect(savedShare('premise')).toBe(DEFAULT_SHARE)
    saveShare('joke', null)
    expect(savedShare('joke')).toBe(DEFAULT_SHARE)
  })
})
