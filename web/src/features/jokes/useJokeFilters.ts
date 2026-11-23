/**
 * Jokes list state lives in the URL (?topic=&sub=&premise=&type=&status=&q=&sort=&discarded=), so back,
 * refresh and links keep your place. Discarded jokes are hidden until ?discarded=show (discarded.ts). Filtering runs in the browser, so it works offline.
 * Arrive with no filters in the URL and the ones you used last come back (rememberFilters.ts).
 */
import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useJokes } from '../../api/library'
import type { Joke } from '../../api/types'
import { byStrength, UNDEFINED_TYPE } from '../../lib/jokeMeta'
import { NO_PREMISE, ON_A_PREMISE } from '../../lib/premises'
import { keepDiscarded } from './discarded'
import { recall, remember } from './rememberFilters'

export type SortKey = 'new' | 'old' | 'edited' | 'strong' | 'weak' | 'long'

export const SORTS: Record<SortKey, string> = {
  new: 'Newest',
  old: 'Oldest',
  edited: 'Recently edited',
  strong: 'Strongest',
  weak: 'Weakest',
  long: 'Longest',
}

/** The date a sort runs on, when it runs on one: these sorts get month headings and the time scrubber. */
export const sortDate = (sort: SortKey): ((b: Joke) => string) | null =>
  sort === 'edited' ? (b) => b.updated_at : sort === 'new' || sort === 'old' ? (b) => b.created_at : null

export function matchesSearch(joke: Joke, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  return [joke.setup, joke.punchline, joke.comments, ...joke.hashtags, ...joke.tag_lines, ...(joke.alt_punchlines ?? [])].some((t) => t.toLowerCase().includes(needle))
}

export function matchesPremise(joke: Joke, premise: string | null): boolean {
  if (!premise) return true
  if (premise === NO_PREMISE) return !joke.premise_id
  if (premise === ON_A_PREMISE) return Boolean(joke.premise_id)
  return joke.premise_id === premise
}

export function matchesType(joke: Joke, type: string | null): boolean {
  if (!type) return true
  if (type === UNDEFINED_TYPE) return joke.types.length === 0
  return joke.types.some((t) => t.toLowerCase() === type.toLowerCase())
}

const SORTERS: Record<SortKey, (a: Joke, b: Joke) => number> = {
  new: (a, b) => b.created_at.localeCompare(a.created_at),
  old: (a, b) => a.created_at.localeCompare(b.created_at),
  edited: (a, b) => b.updated_at.localeCompare(a.updated_at),
  strong: (a, b) => byStrength(a.strength, b.strength, true) || b.created_at.localeCompare(a.created_at),
  weak: (a, b) => byStrength(a.strength, b.strength, false) || b.created_at.localeCompare(a.created_at),
  long: (a, b) => b.duration_seconds - a.duration_seconds,
}

export function useJokeFilters() {
  const [params, setParams] = useSearchParams()
  const { data: jokes = [], isPending } = useJokes()
  const f = {
    topic: params.get('topic'),
    sub: params.get('sub'),
    premise: params.get('premise'),
    type: params.get('type'),
    status: params.get('status'),
    q: params.get('q') ?? '',
    sort: (params.get('sort') as SortKey | null) ?? 'new',
    showDiscarded: params.get('discarded') === 'show',
  }

  const set = (changes: Partial<Record<'topic' | 'sub' | 'premise' | 'type' | 'status' | 'q' | 'sort' | 'discarded', string | null>>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    remember(next.toString())
    setParams(next, { replace: true })
  }

  // A link without filters (the nav, a joke opened from Home or a chain) brings the last ones back;
  // with filters, using them keeps them fresh for the hour.
  const query = params.toString()
  useEffect(() => {
    if (query) return remember(query)
    const saved = recall()
    if (saved) setParams(new URLSearchParams(saved), { replace: true })
  }, [query, setParams])

  const { visible, discarded } = useMemo(() => {
    const matching = jokes.filter(
      (b) =>
        (!f.topic || b.topic_id === f.topic) &&
        (!f.sub || b.subtopic_id === f.sub) &&
        matchesPremise(b, f.premise) &&
        matchesType(b, f.type) &&
        (!f.status || b.status === f.status) &&
        matchesSearch(b, f.q),
    )
    const { kept, discarded } = keepDiscarded(matching, f.showDiscarded, Boolean(f.status))
    return { visible: kept.sort(SORTERS[f.sort] ?? SORTERS.new), discarded }
  }, [jokes, f.topic, f.sub, f.premise, f.type, f.status, f.q, f.sort, f.showDiscarded])

  const active = Boolean(f.topic || f.premise || f.type || f.status || f.q)
  // Hidden discarded jokes narrow the list without being a filter you set, so Clear leaves them be.
  const hidingDiscarded = discarded > 0 && !f.showDiscarded
  return { ...f, set, visible, discarded, hidingDiscarded, total: jokes.length, isPending, active, query }
}
