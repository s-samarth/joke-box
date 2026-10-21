/**
 * LPM, laughs per minute: score every laugh from 1 (a few giggles) to 5 (laughs and applause),
 * add up the points, and divide by the minutes on stage. A show's tally is five counts, one per
 * score, so `laughs[0]` is how many 1-point laughs there were and `laughs[4]` the 5-pointers.
 */
import type { PerformanceLog } from '../../api/types'

/** The scores, best first, as the tally lists them. */
export const LAUGH_SCORES = [
  { points: 5, label: 'Laughs and applause' },
  { points: 4, label: 'Laughs, some applause' },
  { points: 3, label: 'Strong laughs' },
  { points: 2, label: 'Some laughs' },
  { points: 1, label: 'A few giggles' },
] as const

export const NO_LAUGHS = [0, 0, 0, 0, 0]

export const laughPoints = (laughs: number[]): number => laughs.reduce((sum, n, i) => sum + n * (i + 1), 0)

/** A tally with nothing in it counts as not counted. */
export const counted = (laughs: number[] | null | undefined): laughs is number[] => Boolean(laughs?.some((n) => n > 0))

export function lpm(laughs: number[] | null | undefined, seconds: number): number | null {
  if (!counted(laughs) || seconds <= 0) return null
  return laughPoints(laughs) / (seconds / 60)
}

/** Across shows: all the points over all the minutes, so a long set counts for more. */
export function averageLpm(logs: PerformanceLog[]): { lpm: number; shows: number } | null {
  const scored = logs.filter((l) => counted(l.laughs) && l.duration_seconds > 0)
  if (!scored.length) return null
  const points = scored.reduce((sum, l) => sum + laughPoints(l.laughs ?? NO_LAUGHS), 0)
  const minutes = scored.reduce((sum, l) => sum + l.duration_seconds, 0) / 60
  return { lpm: points / minutes, shows: scored.length }
}

export function lpmBand(value: number): string {
  if (value >= 12) return 'beast'
  if (value >= 9) return 'decent'
  if (value >= 6) return 'poor'
  return 'rough'
}

export const formatLpm = (value: number): string => `${value.toFixed(1)} LPM, ${lpmBand(value)}`
