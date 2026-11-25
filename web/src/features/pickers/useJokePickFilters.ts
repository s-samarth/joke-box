/**
 * A joke picker's own filters, shaped like the Jokes list's (JokeFilters reads either), but kept in
 * the sheet instead of the URL: opening a picker never changes the list behind it. It starts on
 * the topic, subtopic or premise the caller gives (where what you want usually is: a cluster's
 * lead, the joke being linked, the premise in a set), sorted by Recently edited; clear them to
 * pick from anywhere. Search finds a cluster by its name too, as in the Jokes list. Given a
 * `memory` key, the filters are kept for an hour (lib/sessionMemory) and the next opening starts
 * where this one left off.
 */
import { useEffect, useMemo, useState } from 'react'
import { useClusters } from '../../api/clusters'
import type { Joke } from '../../api/types'
import { recall, remember } from '../../lib/sessionMemory'
import { keepDiscarded } from '../jokes/discarded'
import type { Filters } from '../jokes/JokeFilters'
import { usePersonaField } from '../jokes/persona'
import { matchesFilters, SORTERS, type FilterKey, type SortKey } from '../jokes/useJokeFilters'

type State = Omit<Filters, 'active' | 'set'> & { showDiscarded: boolean }

/** Where the filters start; null for all topics. */
export interface StartAt {
  topic: string | null
  sub?: string | null
  premise?: string | null
}

const startState = (start: StartAt): State => ({
  topic: start.topic, sub: start.topic ? (start.sub ?? null) : null, premise: start.premise ?? null, type: null, status: null, persona: null, generic: null, q: '', sort: 'edited', showDiscarded: false,
})

export function useJokePickFilters(candidates: Joke[], start: StartAt, memory?: string) {
  const { data: clusters = [] } = useClusters()
  const personaField = usePersonaField()
  const [s, setS] = useState<State>(() => ({ ...startState(start), ...(memory ? recall<State>(memory) : undefined) }))
  useEffect(() => { if (memory) remember<State>(memory, s) }, [memory, s])
  const set = (changes: Partial<Record<FilterKey, string | null>>) =>
    setS((now) => {
      const next = { ...now }
      for (const [key, value] of Object.entries(changes) as [FilterKey, string | null][]) {
        if (key === 'discarded') next.showDiscarded = value === 'show'
        else if (key === 'sort') next.sort = (value as SortKey | null) ?? 'new'
        else if (key === 'q') next.q = value ?? ''
        else if (key !== 'versions') next[key] = value
      }
      return next
    })
  const { shown, discarded } = useMemo(() => {
    const titles = new Map(clusters.map((c) => [c.id, c.title]))
    const personas = new Set(personaField?.options.map((o) => o.id))
    const matching = candidates.filter((j) => matchesFilters(j, { ...s, personas }, titles.get(j.cluster_id ?? '')))
    const { kept, discarded } = keepDiscarded(matching, s.showDiscarded, Boolean(s.status))
    return { shown: [...kept].sort(SORTERS[s.sort] ?? SORTERS.edited), discarded }
  }, [candidates, clusters, personaField, s])
  const active = Boolean(s.topic || s.premise || s.type || s.status || s.persona || s.generic || s.q)
  const f: Filters = { ...s, active, set }
  return { f, shown, discarded, showDiscarded: s.showDiscarded }
}
