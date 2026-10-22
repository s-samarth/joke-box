/**
 * Joke chains. A joke can follow one joke, and many jokes can follow the same one, so the links
 * form trees: walking back from any joke gives one line to the start of its chain.
 */

interface Linked {
  id: string
  follows_id?: string | null
}

/** The jokes leading up to `bit`, first one first, ending with `bit`. Stops at a joke you can't see (in the Trash). */
export function chainTo<T extends Linked>(bit: T, byId: Map<string, T>): T[] {
  const chain = [bit]
  const seen = new Set([bit.id])
  for (let at = bit.follows_id; at && !seen.has(at); ) {
    const prev = byId.get(at)
    if (!prev) break
    chain.unshift(prev)
    seen.add(at)
    at = prev.follows_id
  }
  return chain
}

/** The jokes that follow `id` directly. */
export const followersOf = <T extends Linked>(id: string, bits: T[]): T[] => bits.filter((b) => b.follows_id === id)

/** `id` and every joke after it, down every branch: none of these can come before it. */
export function laterThan(id: string, bits: Linked[]): Set<string> {
  const out = new Set([id])
  for (let grew = true; grew; ) {
    grew = false
    for (const b of bits) {
      if (b.follows_id && out.has(b.follows_id) && !out.has(b.id)) {
        out.add(b.id)
        grew = true
      }
    }
  }
  return out
}
