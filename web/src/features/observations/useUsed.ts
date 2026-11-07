/** What has come from each observation so far: jokes and premises still around (not in the Trash). */
import { useJokes } from '../../api/library'
import { usePremises } from '../../api/premises'
import type { Observation } from '../../api/types'

export function useUses() {
  const { data: premises = [] } = usePremises()
  const { data: jokes = [] } = useJokes()
  const livePremises = new Set(premises.map((p) => p.id))
  const liveJokes = new Set(jokes.map((j) => j.id))
  const counts = (o: Observation) => ({
    jokes: (o.joke_ids ?? []).filter((id) => liveJokes.has(id)).length,
    premises: (o.premise_ids ?? []).filter((id) => livePremises.has(id)).length,
  })
  /** "2 jokes · 1 premise", or "Not used yet". */
  const label = (o: Observation) => {
    const c = counts(o)
    const parts = [c.jokes && `${c.jokes} ${c.jokes === 1 ? 'joke' : 'jokes'}`, c.premises && `${c.premises} ${c.premises === 1 ? 'premise' : 'premises'}`].filter(Boolean)
    return parts.length ? parts.join(' · ') : 'Not used yet'
  }
  const used = (o: Observation) => counts(o).jokes + counts(o).premises > 0
  return { used, label }
}
