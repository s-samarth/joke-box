/**
 * One search across everything: jokes, premises, observations, brainstorms, rewrites, voice
 * notes, sets, shows, Craft, analyses and the watchlist. It runs in the browser over the lists
 * on this device, so it works offline; any list not loaded yet is fetched. The query lives in
 * the URL (?q=), so the back button comes back to the same results.
 */
import { Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { useCraftNotes } from '../../api/craft'
import { useJokes } from '../../api/library'
import { useObservations } from '../../api/notebook'
import { usePremises } from '../../api/premises'
import { useSessionList } from '../../api/sessions'
import { useBrainstorms, useLogs, useSetlists } from '../../api/shows'
import { useAnalyses, useWatchlist } from '../../api/study'
import { useVoiceNotes } from '../../api/voice'
import { Input } from '../../components/ui/Field'
import { EmptyState, PageHead } from '../../components/ui/pieces'
import { searchAll } from './searchIndex'

/** Each group shows this many at first; the rest are a tap away. */
const FIRST = 8

function useEverything() {
  return {
    jokes: useJokes().data,
    premises: usePremises().data,
    observations: useObservations().data,
    sessions: useSessionList().data,
    rewrites: useBrainstorms().data,
    voice: useVoiceNotes().data,
    sets: useSetlists().data,
    shows: useLogs().data,
    craft: useCraftNotes().data,
    analyses: useAnalyses().data,
    watchlist: useWatchlist().data,
  }
}

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const all = params.get('all')
  const groups = searchAll(useEverything(), query)
  const total = groups.reduce((n, g) => n + g.hits.length, 0)
  const setQuery = (q: string) => setParams((p) => { if (q) p.set('q', q); else p.delete('q'); p.delete('all'); return p }, { replace: true })

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Search" />
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
        <Input type="search" autoFocus aria-label="Search everything" placeholder="Search everything you've written" className="pl-10"
          value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <p className="mt-2 text-sm text-faint">Every word has to appear. Handwriting can't be searched: brainstorms are found by their title and typed words.</p>

      {!query.trim() ? (
        <p className="mt-8 text-dim">Jokes, premises, observations, brainstorms, rewrites, voice notes, sets, shows, Craft, analyses and the watchlist.</p>
      ) : total === 0 ? (
        <EmptyState title="Nothing found">Try fewer words, or another spelling.</EmptyState>
      ) : (
        <div className="mt-6 space-y-8">
          <p className="text-sm text-dim tabular" aria-live="polite">{total} found</p>
          {groups.map((g) => {
            const open = all === g.kind
            const shown = open ? g.hits : g.hits.slice(0, FIRST)
            return (
              <section key={g.kind} aria-label={g.kind}>
                <h2 className="mb-1 text-sm font-medium text-dim">{g.kind} <span className="text-faint tabular">{g.hits.length}</span></h2>
                <ul className="divide-y divide-rule border-y border-rule">
                  {shown.map((h) => (
                    <li key={h.id}>
                      <Link to={h.to} className="block py-3 hover:text-tape">
                        <span className="line-clamp-2 text-[17px]">{h.title || 'Untitled'}</span>
                        {h.detail && <span className="mt-0.5 line-clamp-2 text-sm text-faint">{h.detail}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
                {g.hits.length > shown.length && (
                  <button type="button" onClick={() => setParams((p) => { p.set('all', g.kind); return p }, { replace: true })}
                    className="mt-1 inline-flex h-11 items-center text-sm text-tape hover:underline">
                    Show all {g.hits.length}
                  </button>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
