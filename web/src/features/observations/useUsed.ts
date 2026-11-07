/**
 * What has come from each observation so far: jokes and premises still around (not in the Trash),
 * and the brainstorm sessions it's linked to. A session holds its own links, so they're read
 * from the session list rather than copied onto the observation, and can't drift apart.
 */
import { useJokes } from '../../api/library'
import { usePremises } from '../../api/premises'
import { useSessionSummaries } from '../../api/sessions'
import type { Observation, SessionSummary } from '../../api/types'

const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`

export function useUses() {
  const { data: premises = [] } = usePremises()
  const { data: jokes = [] } = useJokes()
  const { data: sessions = [] } = useSessionSummaries()
  const livePremises = new Set(premises.map((p) => p.id))
  const liveJokes = new Set(jokes.map((j) => j.id))
  /** The sessions an observation was brainstormed in, newest first. */
  const brainstorms = (o: Observation): SessionSummary[] =>
    sessions.filter((s) => (s.observation_ids ?? []).includes(o.id)).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  const counts = (o: Observation) => ({
    jokes: (o.joke_ids ?? []).filter((id) => liveJokes.has(id)).length,
    premises: (o.premise_ids ?? []).filter((id) => livePremises.has(id)).length,
    brainstorms: brainstorms(o).length,
  })
  /** "2 jokes · 1 premise · 1 brainstorm", or "Not used yet". */
  const label = (o: Observation) => {
    const c = counts(o)
    const parts = [c.jokes && plural(c.jokes, 'joke'), c.premises && plural(c.premises, 'premise'), c.brainstorms && plural(c.brainstorms, 'brainstorm')].filter(Boolean)
    return parts.length ? parts.join(' · ') : 'Not used yet'
  }
  const used = (o: Observation) => {
    const c = counts(o)
    return c.jokes + c.premises + c.brainstorms > 0
  }
  return { used, label, brainstorms }
}
