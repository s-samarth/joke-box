import { afterEach, describe, expect, it, vi } from 'vitest'
import { chooseFingerDraws, fingerDraws, pencilSeen } from './fingerDraw'
import { INK_SIZES, MIN_ZOOM, nearestSize, PAGE_SPAN, PAGE_WIDTH, pixelRatio, scrollAfterZoom } from './ink'
import { saveFocus, savedFocus } from './prefs'

describe('pen sizes', () => {
  it('has three thicknesses', () => {
    expect(INK_SIZES.map((s) => s.label)).toEqual(['Fine', 'Medium', 'Thick'])
  })

  it('maps a pen remembered from the old five sizes to the closest one', () => {
    expect(nearestSize(1.2)).toBe(1.2)
    expect(nearestSize(4)).toBe(2.4)
    expect(nearestSize(7)).toBe(6)
    expect(nearestSize(12)).toBe(6)
  })
})

describe('zooming a page', () => {
  it('keeps the spot under your fingers where it was', () => {
    const o = { focusX: 300, focusY: 500, pageX: 250, pageY: 400, frameLeft: 20, canvasTop: 180 }
    for (const scale of [0.7, 1.4, 2.1]) {
      const { left, top } = scrollAfterZoom({ ...o, scale })
      expect(o.frameLeft - left + o.pageX * scale).toBeCloseTo(o.focusX) // where the spot lands across
      expect(o.canvasTop - top + o.pageY * scale).toBeCloseTo(o.focusY) // and down
    }
  })

  it('pinched all the way out, fits the whole double-width page on screen', () => {
    expect(PAGE_SPAN * MIN_ZOOM).toBe(PAGE_WIDTH)
  })

  it('draws at full sharpness until the canvas would get too big for Safari', () => {
    expect(pixelRatio(800, 1100, 2)).toBe(2)
    const zoomed = pixelRatio(2400, 3400, 2)
    expect(zoomed).toBeLessThan(2)
    expect(2400 * 3400 * zoomed ** 2).toBeLessThanOrEqual(12_000_001)
  })
})

describe('draw with finger', () => {
  const stubStorage = () => {
    const kept = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => kept.set(k, v) })
  }
  afterEach(() => vi.unstubAllGlobals())

  it('lets a finger draw on a device that has never seen a Pencil', () => {
    stubStorage()
    expect(fingerDraws()).toBe(true)
  })

  it('stops once the device sees a Pencil, and remembers', () => {
    stubStorage()
    pencilSeen()
    expect(fingerDraws()).toBe(false)
  })

  it('follows the switch either way', () => {
    stubStorage()
    pencilSeen()
    chooseFingerDraws(true)
    expect(fingerDraws()).toBe(true)
    chooseFingerDraws(false)
    expect(fingerDraws()).toBe(false)
  })

  it('still answers when storage is blocked', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    pencilSeen()
    expect(fingerDraws()).toBe(true)
  })
})

describe('full screen', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('starts off, and is remembered once switched on', () => {
    const kept = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => kept.set(k, v) })
    expect(savedFocus()).toBe(false)
    saveFocus(true)
    expect(savedFocus()).toBe(true)
    saveFocus(false)
    expect(savedFocus()).toBe(false)
  })

  it('stays off when storage is blocked', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    saveFocus(true)
    expect(savedFocus()).toBe(false)
  })
})
