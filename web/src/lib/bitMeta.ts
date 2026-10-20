/** Display rules for bits: type colours, strength labels and editor suggestions. */
import type { CleanRating } from '../api/types'

export const UNDEFINED_TYPE = 'Undefined'

/** The seven known joke forms, suggested in the editor even before you've used them. */
export const DEFAULT_TYPES = [
  'One-Liner',
  'Story',
  'Crowd Work',
  'Roast',
  'Observation',
  'Premise',
  'Act Out',
]

/** Tailwind classes per type: a muted tint with readable text. Unknown types get a neutral chip. */
const TYPE_STYLES: Record<string, string> = {
  'one-liner': 'bg-cyan-400/10 text-cyan-300 ring-cyan-400/20',
  story: 'bg-violet-400/10 text-violet-300 ring-violet-400/20',
  'crowd work': 'bg-amber-400/10 text-amber-300 ring-amber-400/20',
  roast: 'bg-red-400/10 text-red-300 ring-red-400/20',
  observation: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
  premise: 'bg-pink-400/10 text-pink-300 ring-pink-400/20',
  'act out': 'bg-orange-400/10 text-orange-300 ring-orange-400/20',
}

export const typeStyle = (name: string): string =>
  TYPE_STYLES[name.toLowerCase()] ?? 'bg-white/5 text-muted ring-white/10'

export const STRENGTH_LABELS = ['Weak', 'Needs Work', 'Decent', 'Strong', 'Killer']

export const strengthLabel = (strength: number): string =>
  STRENGTH_LABELS[Math.min(Math.max(strength, 1), 5) - 1]

export const CLEAN_LABELS: Record<CleanRating, string> = {
  clean: 'Clean',
  mild: 'Mild',
  dirty: 'Dirty',
}

export const LANGUAGE_SUGGESTIONS = ['English', 'Hinglish', 'Hindi']

/** A bit's types for display; no types means "Undefined". */
export const displayTypes = (types: string[]): string[] => (types.length ? types : [UNDEFINED_TYPE])
