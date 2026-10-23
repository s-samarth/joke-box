/** Display rules for jokes: strength words, Thoughts, and editor suggestions. Type colours: typeColors.ts. */
import type { CleanRating, Topic } from '../api/types'

export const UNDEFINED_TYPE = 'Undefined'

/** The seven common joke forms, offered in the editor even before you've used them. */
export const DEFAULT_TYPES = ['One-Liner', 'Story', 'Crowd Work', 'Roast', 'Observation', 'Premise', 'Act Out']

export const STRENGTH_LABELS = ['Weak', 'Needs work', 'Decent', 'Strong', 'Killer']

export const strengthLabel = (strength: number): string =>
  STRENGTH_LABELS[Math.min(Math.max(strength, 1), 5) - 1]

export const CLEAN_LABELS: Record<CleanRating, string> = { clean: 'Clean', mild: 'Mild', dirty: 'Dirty' }

/** The languages a joke can be in. New jokes start in Hinglish. */
export const LANGUAGES = ['Hinglish', 'Hindi', 'English']

/** Statuses that mean "still being written". */
export const UNFINISHED = new Set(['incomplete', 'work in progress', 'draft', 'need tags'])

/** Every joke has a status. None, or the retired "Status Unknown", means Draft (the server agrees). */
export const DEFAULT_STATUS = 'Draft'
export const statusOf = (status: string | null): string =>
  !status?.trim() || status.trim().toLowerCase() === 'status unknown' ? DEFAULT_STATUS : status

/** The protected default topic is stored as "Random"; the app calls it Thoughts. */
export const THOUGHTS = 'Thoughts'
export const topicName = (topic?: Topic): string => (!topic ? '' : topic.is_system ? THOUGHTS : topic.name)

export const displayTypes = (types: string[]): string[] => (types.length ? types : [UNDEFINED_TYPE])
