/**
 * Jokes list state lives in the URL (?topic=&sub=&premise=&type=&status=&q=&sort=), so back, refresh and
 * links keep your place. Filtering runs in the browser, so it works offline.
 * Arrive with no filters in the URL and the ones you used last come back (rememberFilters.ts).
 */
import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useJokes } from '../../api/library'
import type { Joke } from '../../api/types'
import { UNDEFINED_TYPE } from '../../lib/jokeMeta'
import { NO_PREMISE } from '../../lib/premises'
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
  return [joke.setup, joke.punchline, joke.comments, ...joke.hashtags, ...joke.tag_lines].some((t) => t.toLowerCase().includes(needle))
}

export function matchesPremise(joke: Joke, premise: string | null): boolean {
  if (!premise) return true
  return premise === NO_PREMISE ? !joke.premise_id : joke.premise_id === premise
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
  strong: (a, b) => b.strength - a.strength || b.created_at.localeCompare(a.created_at),
  weak: (a, b) => a.strength - b.strength || b.created_at.localeCompare(a.created_at),
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
  }

  const set = (changes: Partial<Record<'topic' | 'sub' | 'premise' | 'type' | 'status' | 'q' | 'sort', string | null>>) => {
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

  const visible = useMemo(
    () =>
      jokes
        .filter(
          (b) =>
            (!f.topic || b.topic_id === f.topic) &&
            (!f.sub || b.subtopic_id === f.sub) &&
            matchesPremise(b, f.premise) &&
            matchesType(b, f.type) &&
            (!f.status || b.status === f.status) &&
            matchesSearch(b, f.q),
        )
        .sort(SORTERS[f.sort] ?? SORTERS.new),
    [jokes, f.topic, f.sub, f.premise, f.type, f.status, f.q, f.sort],
  )

  const active = Boolean(f.topic || f.premise || f.type || f.status || f.q)
  return { ...f, set, visible, total: jokes.length, isPending, active, query }
}
