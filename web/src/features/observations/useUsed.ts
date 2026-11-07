/** Whether anything has come from an observation yet, and where an observation opens. */
import { useJokes } from '../../api/library'
import { usePremises } from '../../api/premises'
import type { Observation } from '../../api/types'

/** Used: a premise or joke came from it and is still around (not in the Trash). */
export function useUsed() {
  const { data: premises = [] } = usePremises()
  const { data: jokes = [] } = useJokes()
  const live = new Set([...premises.map((p) => p.id), ...jokes.map((j) => j.id)])
  return (o: Observation) => [...(o.premise_ids ?? []), ...(o.joke_ids ?? [])].some((id) => live.has(id))
}

/** Observations have no page of their own: open the list searched for its first words. */
export const observationHref = (o: Observation) =>
  `/observations?q=${encodeURIComponent(o.text.split(/\s+/).slice(0, 6).join(' '))}`
