/**
 * The premises list's search, topic, status and sort, kept in the URL
 * (?q=&topic=&status=&sort=&discarded=) like the jokes list, so back and refresh keep your place,
 * and remembered for a while like Jokes' (so the tab bar brings you back to them). Searching
 * covers the take and the notes. Discarded premises are hidden until ?discarded=show, or until
 * you pick a status, like discarded jokes (see jokes/discarded.ts).
 */
import { useMemo } from 'react'
import { useJokes, useTopics } from '../../api/library'
import { usePremises } from '../../api/premises'
import { countByPremise } from '../../lib/premises'
import { useRememberedParams } from '../../lib/useRememberedParams'
import { keepDiscarded } from '../jokes/discarded'
import { premiseMatches, premiseSort, sortPremises } from './premiseSort'

export { PREMISE_SORTS, type PremiseSort } from './premiseSort'

type Param = 'q' | 'topic' | 'status' | 'sort' | 'discarded'

export function usePremiseFilters() {
  // ?new=1 is the open New dialog, not a filter.
  const { params, update } = useRememberedParams('premises-filters', ['new'])
  const { data: premises = [], isPending } = usePremises()
  const { data: jokes = [] } = useJokes()
  const { data: topics = [] } = useTopics()
  const q = params.get('q') ?? ''
  const topic = params.get('topic')
  const status = params.get('status')
  const sort = premiseSort(params.get('sort'))
  const showDiscarded = params.get('discarded') === 'show'
  const counts = useMemo(() => countByPremise(jokes), [jokes])

  const set = (changes: Partial<Record<Param, string | null>>) =>
    update((next) => {
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
    })

  const { visible, discarded } = useMemo(() => {
    const matching = premises.filter((p) => premiseMatches(p, q, topic, status))
    const { kept, discarded } = keepDiscarded(matching, showDiscarded, Boolean(status))
    const order = sortPremises(kept, sort, (p) => counts.get(p.id) ?? 0, topics.map((t) => t.id))
    return { visible: order, discarded }
  }, [premises, counts, topics, q, topic, status, sort, showDiscarded])

  const loose = jokes.filter((j) => !j.premise_id).length
  const active = Boolean(q || topic || status)
  // Hidden discarded premises narrow the list without being a filter you set, so Clear leaves them be.
  const hidingDiscarded = discarded > 0 && !showDiscarded
  return { q, topic, status, sort, showDiscarded, set, visible, discarded, hidingDiscarded, counts, loose, total: premises.length, isPending, active }
}
