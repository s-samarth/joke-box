/**
 * Jokes list state lives in the URL (?topic=&sub=&type=&status=&q=&sort=), so back, refresh and
 * links keep your place. Filtering runs in the browser, so it works offline.
 */
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useJokes } from '../../api/library'
import type { Joke } from '../../api/types'
import { UNDEFINED_TYPE } from '../../lib/jokeMeta'

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
    type: params.get('type'),
    status: params.get('status'),
    q: params.get('q') ?? '',
    sort: (params.get('sort') as SortKey | null) ?? 'new',
  }

  const set = (changes: Partial<Record<'topic' | 'sub' | 'type' | 'status' | 'q' | 'sort', string | null>>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  const visible = useMemo(
    () =>
      jokes
        .filter(
          (b) =>
            (!f.topic || b.topic_id === f.topic) &&
            (!f.sub || b.subtopic_id === f.sub) &&
            matchesType(b, f.type) &&
            (!f.status || b.status === f.status) &&
            matchesSearch(b, f.q),
        )
        .sort(SORTERS[f.sort] ?? SORTERS.new),
    [jokes, f.topic, f.sub, f.type, f.status, f.q, f.sort],
  )

  const active = Boolean(f.topic || f.type || f.status || f.q)
  return { ...f, set, visible, total: jokes.length, isPending, active, query: params.toString() }
}
