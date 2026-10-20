/**
 * How loud the mic is, as 0..1 for the level meter.
 *
 * Measured in decibels, not raw amplitude: hearing is logarithmic, and speech after the
 * browser's noise suppression sits at only a few percent of full scale. On a straight-line
 * scale normal talking barely moved the bars; on a decibel scale it fills most of the meter.
 */

/** Quieter than this shows as silence (a quiet room). */
const FLOOR_DB = -60
/** Louder than this fills the meter (talking close to the phone). */
const CEILING_DB = -18

/** Root-mean-square loudness of one block of samples (each -1..1), mapped to 0..1. */
export function loudness(samples: ArrayLike<number>): number {
  if (!samples.length) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) sum += samples[i] ** 2
  const rms = Math.sqrt(sum / samples.length)
  if (rms <= 0) return 0
  const db = 20 * Math.log10(rms)
  return Math.min(1, Math.max(0, (db - FLOOR_DB) / (CEILING_DB - FLOOR_DB)))
}

/** Jump up at once, fall back gently, so the bars track syllables without flickering. */
export const smooth = (previous: number, next: number): number => Math.max(next, previous * 0.85)
