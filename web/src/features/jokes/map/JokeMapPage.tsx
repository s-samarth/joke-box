/**
 * The joke map and the joke board, as a screen. On desktop it fills the space beside the list when
 * no joke is open; /jokes/map opens it on its own, which is how a phone gets to it. Both show
 * whatever the list is showing, since the filters live in the URL.
 *
 * Map draws chains left to right; Board scatters every joke over topic islands; Web puts each
 * premise in the middle of its jokes. The choice is remembered on this device.
 */
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useJokes } from '../../../api/library'
import { EmptyState, Spinner } from '../../../components/ui/pieces'
import { useJokeFilters } from '../useJokeFilters'
import { JokeBoard } from './JokeBoard'
import { JokeMap } from './JokeMap'
import { JokeWeb } from './JokeWeb'

type View = 'map' | 'board' | 'web'
const VIEWS: Record<View, { tab: string; title: string }> = {
  map: { tab: 'Map', title: 'Joke map' },
  board: { tab: 'Board', title: 'Joke board' },
  web: { tab: 'Web', title: 'Premise web' },
}
const VIEW_KEY = 'jokebox.jokeView'

function savedView(): View {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    return saved === 'board' || saved === 'web' ? saved : 'map'
  } catch {
    return 'map'
  }
}

export function JokeMapPage({ own = false }: { own?: boolean }) {
  const f = useJokeFilters()
  const { data: all = [] } = useJokes()
  const [view, setView] = useState<View>(savedView)
  const choose = (v: View) => {
    setView(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      // Private mode: it just won't be remembered.
    }
  }

  return (
    <div className="pt-2 pb-16 lg:pt-10">
      {own && (
        <Link to={`/jokes${f.query ? `?${f.query}` : ''}`} className="inline-flex h-12 items-center gap-1.5 text-dim hover:text-paper lg:hidden">
          <ArrowLeft size={18} /> Jokes
        </Link>
      )}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="headline text-4xl">{VIEWS[view].title}</h2>
        <div role="tablist" aria-label="Map, board or web" className="flex rounded-lg bg-ink-3 p-0.5 text-sm">
          {(Object.keys(VIEWS) as View[]).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => choose(v)}
              className={`h-9 rounded-md px-4 ${view === v ? 'bg-ink-4 text-paper' : 'text-dim hover:text-paper'}`}>{VIEWS[v].tab}</button>
          ))}
        </div>
      </div>
      {f.isPending ? (
        <div className="py-16"><Spinner /></div>
      ) : f.visible.length === 0 ? (
        <EmptyState title="Nothing here">{f.active ? 'No jokes match these filters. Clear them to see everything.' : 'Write a joke and it shows up here.'}</EmptyState>
      ) : view === 'map' ? (
        <JokeMap shown={f.visible} all={all} query={f.query} />
      ) : view === 'board' ? (
        <JokeBoard shown={f.visible} all={all} query={f.query} />
      ) : (
        <JokeWeb shown={f.visible} all={all} query={f.query} everything={!f.active} />
      )}
    </div>
  )
}
