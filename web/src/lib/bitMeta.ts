/** Display rules for bits: type colours, strength words, the Inbox, and editor suggestions. */
import type { CleanRating, Topic } from '../api/types'

export const UNDEFINED_TYPE = 'Undefined'

/** The seven common joke forms, offered in the editor even before you've used them. */
export const DEFAULT_TYPES = ['One-Liner', 'Story', 'Crowd Work', 'Roast', 'Observation', 'Premise', 'Act Out']

const TYPE_DOTS: Record<string, string> = {
  'one-liner': 'bg-sky-300',
  story: 'bg-violet-300',
  'crowd work': 'bg-amber-300',
  roast: 'bg-rose-400',
  observation: 'bg-emerald-300',
  premise: 'bg-pink-300',
  'act out': 'bg-orange-300',
}

export const typeDot = (name: string): string => TYPE_DOTS[name.toLowerCase()] ?? 'bg-faint'

export const STRENGTH_LABELS = ['Weak', 'Needs work', 'Decent', 'Strong', 'Killer']

export const strengthLabel = (strength: number): string =>
  STRENGTH_LABELS[Math.min(Math.max(strength, 1), 5) - 1]

export const CLEAN_LABELS: Record<CleanRating, string> = { clean: 'Clean', mild: 'Mild', dirty: 'Dirty' }

export const LANGUAGE_SUGGESTIONS = ['English', 'Hinglish', 'Hindi']

/** Statuses that mean "still being written". */
export const UNFINISHED = new Set(['incomplete', 'work in progress', 'draft', 'status unknown'])

/** The protected default topic is stored as "Random"; the app calls it the Inbox. */
export const topicName = (topic?: Topic): string => (!topic ? '' : topic.is_system ? 'Inbox' : topic.name)

export const displayTypes = (types: string[]): string[] => (types.length ? types : [UNDEFINED_TYPE])
