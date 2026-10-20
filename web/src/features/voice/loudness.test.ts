import { describe, expect, it } from 'vitest'
import { loudness, smooth } from './loudness'

const tone = (amplitude: number) => Array.from({ length: 512 }, (_, i) => amplitude * Math.sin(i / 4))

describe('loudness', () => {
  it('reads silence and empty input as zero', () => {
    expect(loudness(new Float32Array(512))).toBe(0)
    expect(loudness([])).toBe(0)
  })

  it('puts ordinary speech levels well up the meter', () => {
    // ~5% of full scale: typical talking after noise suppression, which used to show as dots
    expect(loudness(tone(0.05))).toBeGreaterThan(0.5)
    expect(loudness(tone(0.05))).toBeLessThan(1)
  })

  it('treats room hiss as near-silence and clips loud input at 1', () => {
    expect(loudness(tone(0.001))).toBeLessThan(0.1)
    expect(loudness(tone(0.9))).toBe(1)
  })

  it('rises at once and falls gradually', () => {
    expect(smooth(0.2, 0.8)).toBe(0.8)
    expect(smooth(0.8, 0)).toBeCloseTo(0.68)
  })
})
