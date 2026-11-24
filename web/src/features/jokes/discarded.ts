/**
 * Discarded jokes stay out of the Jokes list, map and web until you ask for them: the count line
 * under the filters says how many are hidden, with Show (and Hide to put them away again), like
 * "Show completed" in Todoist. A joke is discarded when its status is called Discarded, in any case.
 * Premises and observations hide theirs the same way.
 * Picking a status in the Status menu says which jokes you want, so the switch stands aside then.
 */
export const DISCARDED = 'discarded'

/** Anything with a status: a joke, a premise or an observation (an old cached one may have none). */
interface HasStatus {
  status?: string | null
}

export const isDiscarded = (item: HasStatus): boolean => item.status?.trim().toLowerCase() === DISCARDED

/**
 * The jokes to show from those the other filters left, and how many of them are discarded (0 when a
 * status is picked, since the switch has nothing to do then).
 */
export function keepDiscarded<T extends HasStatus>(jokes: T[], show: boolean, statusPicked: boolean): { kept: T[]; discarded: number } {
  if (statusPicked) return { kept: jokes, discarded: 0 }
  const discarded = jokes.filter(isDiscarded).length
  return { kept: show || !discarded ? jokes : jokes.filter((j) => !isDiscarded(j)), discarded }
}
