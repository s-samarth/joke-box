/**
 * The rule behind the set builder's status and clean-rating chips. A chip is off, "only" or
 * "not": a joke with a "not" value is hidden, and once any chip is "only", a joke must have one
 * of those values. A joke with no status (or no clean rating) counts as the value "".
 */
import type { Joke } from '../../api/types'

/** What each chip is set to; a chip not in here is off. */
export type Picks = Record<string, 'only' | 'not'>
export interface PickState {
  status: Picks
  clean: Picks
}
export const NO_PICKS: PickState = { status: {}, clean: {} }
export const NONE = ''

function passes(value: string | null, picks: Picks): boolean {
  const v = value ?? NONE
  if (picks[v] === 'not') return false
  return !Object.values(picks).includes('only') || picks[v] === 'only'
}

export const matchesPicks = (joke: Pick<Joke, 'status' | 'clean_rating'>, p: PickState) =>
  passes(joke.status, p.status) && passes(joke.clean_rating, p.clean)

/** Off, then only, then not, then off again. */
export function cycle(picks: Picks, v: string): Picks {
  const { [v]: now, ...rest } = picks
  const to = now === undefined ? 'only' : now === 'only' ? 'not' : undefined
  return to ? { ...rest, [v]: to } : rest
}
