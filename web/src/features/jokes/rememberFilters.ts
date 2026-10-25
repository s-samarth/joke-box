/**
 * The Jokes list remembers its filters for a while, so leaving and coming back (another screen,
 * a joke opened from somewhere else, the map) finds them as you left them. Clear forgets them at
 * once. See lib/sessionMemory for how long they're kept.
 */
import { recall as recallValue, remember as rememberValue } from '../../lib/sessionMemory'

const KEY = 'jokes-filters'

/** Remember the list's query string ('' when cleared). */
export const remember = (query: string): void => rememberValue(KEY, query)

/** The remembered query string, or '' if none or it has lapsed. */
export const recall = (now = Date.now()): string => recallValue<string>(KEY, now) ?? ''
