/**
 * Jokes list state lives in the URL (?topic=&sub=&premise=&type=&status=&persona=&q=&sort=&discarded=&versions=), so back,
 * refresh and links keep your place. Discarded jokes are hidden until ?discarded=show (discarded.ts). Filtering runs in the browser, so it works offline.
 * A cluster's versions stack into one row (cluster/stacks.ts) in either display mode.
 * Arrive with no filters in the URL and the ones you used last come back (lib/useRememberedParams).
 */
import { useMemo } from 'react'
import { useClusters } from '../../api/clusters'
import { useJokes } from '../../api/library'
import type { Joke } from '../../api/types'
import { byStrength, UNDEFINED_TYPE } from '../../lib/jokeMeta'
import { NO_PREMISE, ON_A_PREMISE } from '../../lib/premises'
import { useRememberedParams } from '../../lib/useRememberedParams'
import { stackRows } from './cluster/stacks'
import { usePersonaField } from './persona'
import { keepDiscarded } from './discarded'

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

export function matchesSearch(joke: Joke, q: string, clusterTitle = ''): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  return [clusterTitle, joke.setup, joke.punchline, joke.comments, ...joke.hashtags, ...joke.tag_lines, ...(joke.alt_punchlines ?? [])].some((t) => t.toLowerCase().includes(needle))
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

/** The persona filter's value for jokes that are Not sure (unset, or their option was deleted). */
export const PERSONA_NOT_SURE = 'not-sure'

/** `known`: the persona field's option ids, so a joke whose option was deleted counts as Not sure. */
export function matchesPersona(joke: Joke, persona: string | null | undefined, known?: Set<string>): boolean {
  if (!persona) return true
  const own = joke.persona && (!known || known.has(joke.persona)) ? joke.persona : null
  return persona === PERSONA_NOT_SURE ? !own : own === persona
}

export type FilterKey = 'topic' | 'sub' | 'premise' | 'type' | 'status' | 'persona' | 'q' | 'sort' | 'discarded' | 'versions'

type Narrowing = { topic: string | null; sub: string | null; premise: string | null; type: string | null; status: string | null; persona?: string | null; personas?: Set<string>; q: string }

/** Does the joke pass every filter that's set? Discarded jokes are left to keepDiscarded. */
export const matchesFilters = (b: Joke, f: Narrowing, clusterTitle = ''): boolean =>
  (!f.topic || b.topic_id === f.topic) &&
  (!f.sub || b.subtopic_id === f.sub) &&
  matchesPremise(b, f.premise) &&
  matchesType(b, f.type) &&
  (!f.status || b.status === f.status) &&
  matchesPersona(b, f.persona, f.personas) &&
  matchesSearch(b, f.q, clusterTitle)

export const SORTERS: Record<SortKey, (a: Joke, b: Joke) => number> = {
  new: (a, b) => b.created_at.localeCompare(a.created_at),
  old: (a, b) => a.created_at.localeCompare(b.created_at),
  edited: (a, b) => b.updated_at.localeCompare(a.updated_at),
  strong: (a, b) => byStrength(a.strength, b.strength, true) || b.created_at.localeCompare(a.created_at),
  weak: (a, b) => byStrength(a.strength, b.strength, false) || b.created_at.localeCompare(a.created_at),
  long: (a, b) => b.duration_seconds - a.duration_seconds,
}

export function useJokeFilters() {
  const { params, update, filters: query } = useRememberedParams('jokes-filters')
  const { data: jokes = [], isPending } = useJokes()
  const { data: clusters = [] } = useClusters()
  const personaField = usePersonaField()
  const f = {
    topic: params.get('topic'),
    sub: params.get('sub'),
    premise: params.get('premise'),
    type: params.get('type'),
    status: params.get('status'),
    persona: params.get('persona'),
    q: params.get('q') ?? '',
    sort: (params.get('sort') as SortKey | null) ?? 'new',
    showDiscarded: params.get('discarded') === 'show',
    // Older links and remembered filters with versions=all now open the lead-joke view.
    showClusterNames: !['lead', 'all'].includes(params.get('versions') ?? ''),
  }

  const set = (changes: Partial<Record<FilterKey, string | null>>) =>
    update((next) => {
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
    })

  const { visible, discarded } = useMemo(() => {
    const titles = new Map(clusters.map((c) => [c.id, c.title]))
    const personas = new Set(personaField?.options.map((o) => o.id))
    const matching = jokes.filter((b) => matchesFilters(b, { topic: f.topic, sub: f.sub, premise: f.premise, type: f.type, status: f.status, persona: f.persona, personas, q: f.q }, titles.get(b.cluster_id ?? '')))
    const { kept, discarded } = keepDiscarded(matching, f.showDiscarded, Boolean(f.status))
    return { visible: kept.sort(SORTERS[f.sort] ?? SORTERS.new), discarded }
  }, [jokes, clusters, personaField, f.topic, f.sub, f.premise, f.type, f.status, f.persona, f.q, f.sort, f.showDiscarded])
  const rows = useMemo(() => stackRows(visible, jokes, { clusters, showDiscarded: f.showDiscarded || Boolean(f.status) }), [visible, jokes, clusters, f.showDiscarded, f.status])

  const active = Boolean(f.topic || f.premise || f.type || f.status || f.persona || f.q)
  // Hidden discarded jokes narrow the list without being a filter you set, so Clear leaves them be.
  const hidingDiscarded = discarded > 0 && !f.showDiscarded
  return { ...f, set, visible, rows, discarded, hidingDiscarded, total: jokes.length, isPending, active, query }
}
