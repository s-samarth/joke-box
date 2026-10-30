/**
 * Premises and the jokes resting on them. A premise is filed under a topic, but a joke from any
 * topic can rest on it, so these work from the jokes' premise_id alone.
 */

interface OnPremise {
  id: string
  premise_id?: string | null
  follows_id?: string | null
  created_at: string
}

/** Filter values for jokes resting on no premise, and on any premise at all. */
export const NO_PREMISE = 'none'
export const ON_A_PREMISE = 'any'

/**
 * The jokes resting on a premise, in reading order: oldest first, with each joke's followers
 * right after it, so a chain inside the premise reads as one run.
 */
export function jokesOn<T extends OnPremise>(premiseId: string, jokes: T[]): T[] {
  const mine = jokes.filter((j) => j.premise_id === premiseId).sort((a, b) => a.created_at.localeCompare(b.created_at))
  const ids = new Set(mine.map((j) => j.id))
  const out: T[] = []
  const placed = new Set<string>()
  const visit = (j: T) => {
    if (placed.has(j.id)) return
    placed.add(j.id)
    out.push(j)
    for (const next of mine) if (next.follows_id === j.id) visit(next)
  }
  for (const j of mine) if (!j.follows_id || !ids.has(j.follows_id)) visit(j)
  for (const j of mine) visit(j) // a loop can't happen, but nothing is ever dropped
  return out
}

/** How many jokes rest on each premise. */
export function countByPremise(jokes: OnPremise[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const j of jokes) if (j.premise_id) counts.set(j.premise_id, (counts.get(j.premise_id) ?? 0) + 1)
  return counts
}

/** One joke is a joke; three or more on one premise is turning into a bit. */
export function premiseSize(count: number): string {
  if (count === 0) return 'No jokes yet'
  if (count === 1) return '1 joke'
  return count >= 3 ? `${count} jokes, a bit` : `${count} jokes`
}
