/**
 * Joke chains. A joke can follow one joke, and many jokes can follow the same one, so the links
 * form trees: walking back from any joke gives one line to the start of its chain.
 */

interface Linked {
  id: string
  follows_id?: string | null
}

/** The jokes leading up to `joke`, first one first, ending with `joke`. Stops at a joke you can't see (in the Trash). */
export function chainTo<T extends Linked>(joke: T, byId: Map<string, T>): T[] {
  const chain = [joke]
  const seen = new Set([joke.id])
  for (let at = joke.follows_id; at && !seen.has(at); ) {
    const prev = byId.get(at)
    if (!prev) break
    chain.unshift(prev)
    seen.add(at)
    at = prev.follows_id
  }
  return chain
}

/** The jokes that follow `id` directly. */
export const followersOf = <T extends Linked>(id: string, jokes: T[]): T[] => jokes.filter((b) => b.follows_id === id)

/** `id` and every joke after it, down every branch: none of these can come before it. */
export function laterThan(id: string, jokes: Linked[]): Set<string> {
  const out = new Set([id])
  for (let grew = true; grew; ) {
    grew = false
    for (const b of jokes) {
      if (b.follows_id && out.has(b.follows_id) && !out.has(b.id)) {
        out.add(b.id)
        grew = true
      }
    }
  }
  return out
}
