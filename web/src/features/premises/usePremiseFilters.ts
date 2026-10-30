/**
 * The premises list's search, topic and sort, kept in the URL (?q=&topic=&sort=) like the jokes
 * list, so back and refresh keep your place. Searching covers the take and the notes.
 */
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useJokes, useTopics } from '../../api/library'
import { usePremises, type Premise } from '../../api/premises'
import { countByPremise } from '../../lib/premises'

export type PremiseSort = 'topic' | 'new' | 'most' | 'fewest'

export const PREMISE_SORTS: Record<PremiseSort, string> = {
  topic: 'By topic',
  new: 'Newest',
  most: 'Most jokes',
  fewest: 'Fewest jokes',
}

export function usePremiseFilters() {
  const [params, setParams] = useSearchParams()
  const { data: premises = [], isPending } = usePremises()
  const { data: jokes = [] } = useJokes()
  const { data: topics = [] } = useTopics()
  const q = params.get('q') ?? ''
  const topic = params.get('topic')
  const sort = (params.get('sort') as PremiseSort | null) ?? 'topic'
  const counts = useMemo(() => countByPremise(jokes), [jokes])

  const set = (changes: Partial<Record<'q' | 'topic' | 'sort', string | null>>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const count = (p: Premise) => counts.get(p.id) ?? 0
    const shown = premises.filter((p) => (!topic || p.topic_id === topic) && (!needle || `${p.take}\n${p.notes}`.toLowerCase().includes(needle)))
    if (sort === 'new') return shown.sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (sort === 'most') return shown.sort((a, b) => count(b) - count(a))
    if (sort === 'fewest') return shown.sort((a, b) => count(a) - count(b))
    const order = new Map(topics.map((t, i) => [t.id, i]))
    return shown.sort((a, b) => (order.get(a.topic_id) ?? 0) - (order.get(b.topic_id) ?? 0))
  }, [premises, counts, topics, q, topic, sort])

  const loose = jokes.filter((j) => !j.premise_id).length
  return { q, topic, sort, set, visible, counts, loose, total: premises.length, isPending, active: Boolean(q || topic) }
}
