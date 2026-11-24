/**
 * The picker's own filters, shaped like the Jokes list's (JokeFilters reads either), but kept in
 * the sheet instead of the URL: opening the picker never changes the list behind it. It starts on
 * the lead's topic and subtopic, where versions usually are, sorted by Recently edited.
 */
import { useMemo, useState } from 'react'
import type { Joke } from '../../../api/types'
import { keepDiscarded } from '../discarded'
import type { Filters } from '../JokeFilters'
import { matchesFilters, SORTERS, type FilterKey, type SortKey } from '../useJokeFilters'

type State = Omit<Filters, 'active' | 'set'> & { showDiscarded: boolean }

export function usePickerFilters(candidates: Joke[], lead?: Joke) {
  const [s, setS] = useState<State>({ topic: lead?.topic_id ?? null, sub: lead?.subtopic_id ?? null, premise: null, type: null, status: null, q: '', sort: 'edited', showDiscarded: false })
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
    const matching = candidates.filter((j) => matchesFilters(j, s))
    const { kept, discarded } = keepDiscarded(matching, s.showDiscarded, Boolean(s.status))
    return { shown: [...kept].sort(SORTERS[s.sort]), discarded }
  }, [candidates, s])
  const active = Boolean(s.topic || s.premise || s.type || s.status || s.q)
  const f: Filters = { ...s, active, set }
  return { f, shown, discarded, showDiscarded: s.showDiscarded }
}
