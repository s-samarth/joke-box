/** Timing against the slot, and the chain of jokes a joke brings with it. */
import type { Joke } from '../../api/types'
import { chainTo } from '../../lib/chains'

/** Where the set stands against the slot: room to spare, inside the last minute, or over. */
export function lightState(total: number, target: number): 'ok' | 'light' | 'over' {
  if (target <= 0) return 'ok'
  if (total > target) return 'over'
  return target - total <= 60 ? 'light' : 'ok'
}

/** What adding `joke` puts in a set: the jokes before it in its chain that aren't in yet, in order, then the joke. */
export const chainItems = (joke: Joke, byId: Map<string, Joke>, used: Set<string>) =>
  chainTo(joke, byId)
    .filter((b) => !used.has(b.id))
    .map((b) => ({ joke_id: b.id, duration_seconds: b.duration_seconds, optional: false }))

/** The toast for a joke added with the ones before it, or null when it came alone. */
export const chainNote = (added: number) =>
  added > 1 ? `Also added the ${added - 1 === 1 ? 'joke' : `${added - 1} jokes`} before it` : null
