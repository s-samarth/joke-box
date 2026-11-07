/**
 * Search across everything in JokeBox, in the browser, over the lists already on the device
 * (so it works offline). Handwriting isn't text, so a brainstorm is found by its title and typed
 * words only. Each hit links to where the item lives.
 */
import type { Premise } from '../../api/premises'
import type {
  Analysis, Brainstorm, CraftNote, Joke, Observation, PerformanceLog, SessionSummary, Setlist, VoiceNote, WatchItem,
} from '../../api/types'
import { hasAll, haystack, searchWords, snippet } from '../../lib/search'
import { formatDate } from '../../lib/time'
import { sessionName } from '../brainstorm/sessionMeta'

export interface Lists {
  jokes?: Joke[]
  premises?: Premise[]
  observations?: Observation[]
  sessions?: SessionSummary[]
  rewrites?: Brainstorm[]
  voice?: VoiceNote[]
  sets?: Setlist[]
  shows?: PerformanceLog[]
  craft?: CraftNote[]
  analyses?: Analysis[]
  watchlist?: WatchItem[]
}

export interface Hit {
  id: string
  title: string
  detail: string
  to: string
}

export interface Group {
  kind: string
  hits: Hit[]
}

/** How each kind is searched and shown: its texts, its hashtags, and where a hit opens. */
interface Kind<T> {
  kind: string
  items: (l: Lists) => T[] | undefined
  texts: (item: T) => (string | null | undefined)[]
  tags?: (item: T) => string[]
  title: (item: T) => string
  /** The longer text to show a piece of, around the first match. */
  body?: (item: T) => string
  to: (item: T, query: string) => string
}

const kind = <T,>(k: Kind<T>) => k as unknown as Kind<unknown>
const q = (query: string) => encodeURIComponent(query.trim())

const KINDS: Kind<unknown>[] = [
  kind<Joke>({
    kind: 'Jokes', items: (l) => l.jokes, texts: (j) => [j.setup, j.punchline, j.comments, ...j.tag_lines], tags: (j) => j.hashtags,
    title: (j) => j.setup, body: (j) => [j.punchline, ...j.tag_lines, j.comments].join(' '), to: (j) => `/jokes/${j.id}`,
  }),
  kind<Premise>({ kind: 'Premises', items: (l) => l.premises, texts: (p) => [p.take, p.notes], title: (p) => p.take, body: (p) => p.notes, to: (p) => `/premises/${p.id}` }),
  kind<Observation>({ kind: 'Observations', items: (l) => l.observations, texts: (o) => [o.text], title: (o) => o.text, to: (o) => `/observations/${o.id}` }),
  kind<SessionSummary>({
    kind: 'Brainstorms', items: (l) => l.sessions, texts: (s) => [s.title, s.content], title: (s) => sessionName(s), body: (s) => s.content, to: (s) => `/brainstorm/${s.id}`,
  }),
  kind<Brainstorm>({
    kind: 'Rewrites', items: (l) => l.rewrites, texts: (r) => [r.title, r.content], title: (r) => r.title || 'Rewrite', body: (r) => r.content, to: (r) => `/jokes/${r.joke_id}/rewrite`,
  }),
  kind<VoiceNote>({
    kind: 'Voice notes', items: (l) => l.voice, texts: (v) => [v.label], tags: (v) => v.hashtags,
    title: (v) => v.label || 'Untitled note', body: (v) => v.hashtags.join(' '), to: (_v, query) => `/voice?q=${q(query)}`,
  }),
  kind<Setlist>({ kind: 'Sets', items: (l) => l.sets, texts: (s) => [s.name, s.venue_name], title: (s) => s.name, body: (s) => s.venue_name ?? '', to: (s) => `/sets/${s.id}` }),
  kind<PerformanceLog>({
    kind: 'Shows', items: (l) => l.shows, texts: (s) => [s.venue_name, s.notes],
    title: (s) => `${s.venue_name}, ${formatDate(s.performed_at)}`, body: (s) => s.notes, to: () => '/shows',
  }),
  kind<CraftNote>({
    kind: 'Craft', items: (l) => l.craft, texts: (n) => [n.title, n.body, n.source], tags: (n) => n.hashtags, title: (n) => n.title, body: (n) => n.body, to: (n) => `/craft/${n.id}`,
  }),
  kind<Analysis>({
    kind: 'Analyses', items: (l) => l.analyses, texts: (a) => [a.title, a.body], title: (a) => a.title || 'Untitled analysis', body: (a) => a.body, to: (a) => `/analysis/${a.id}`,
  }),
  kind<WatchItem>({
    kind: 'Watchlist', items: (l) => l.watchlist, texts: (w) => [w.title, w.comedian, w.category, w.description],
    title: (w) => [w.title, w.comedian].filter(Boolean).join(', '), body: (w) => w.description, to: () => '/watchlist',
  }),
]

/** Every kind with at least one hit, in a fixed order. Nothing for an empty query. */
export function searchAll(lists: Lists, query: string): Group[] {
  const words = searchWords(query)
  if (!words.length) return []
  return KINDS.flatMap((k) => {
    const hits = (k.items(lists) ?? [])
      .filter((item) => hasAll(haystack(k.texts(item), k.tags?.(item)), words))
      .map((item) => ({ id: (item as { id: string }).id, title: k.title(item), detail: k.body ? snippet(k.body(item), words) : '', to: k.to(item, query) }))
    return hits.length ? [{ kind: k.kind, hits }] : []
  })
}
