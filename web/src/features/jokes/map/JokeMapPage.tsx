/**
 * The joke map and the joke board, as a screen. On desktop it fills the space beside the list when
 * no joke is open; /jokes/map opens it on its own, which is how a phone gets to it. Both show
 * whatever the list is showing, since the filters live in the URL.
 *
 * Map draws chains left to right; Board scatters every joke over topic islands. The choice is
 * remembered on this device.
 */
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useJokes } from '../../../api/library'
import { EmptyState, Spinner } from '../../../components/ui/pieces'
import { useJokeFilters } from '../useJokeFilters'
import { JokeBoard } from './JokeBoard'
import { JokeMap } from './JokeMap'

type View = 'map' | 'board'
const VIEW_KEY = 'jokebox.jokeView'

function savedView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'board' ? 'board' : 'map'
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
        <h2 className="headline text-4xl">{view === 'map' ? 'Joke map' : 'Joke board'}</h2>
        <div role="tablist" aria-label="Map or board" className="flex rounded-lg bg-ink-3 p-0.5 text-sm">
          {(['map', 'board'] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => choose(v)}
              className={`h-9 rounded-md px-4 ${view === v ? 'bg-ink-4 text-paper' : 'text-dim hover:text-paper'}`}>{v === 'map' ? 'Map' : 'Board'}</button>
          ))}
        </div>
      </div>
      {f.isPending ? (
        <div className="py-16"><Spinner /></div>
      ) : f.visible.length === 0 ? (
        <EmptyState title="Nothing here">{f.active ? 'No jokes match these filters. Clear them to see everything.' : 'Write a joke and it shows up here.'}</EmptyState>
      ) : view === 'map' ? (
        <JokeMap shown={f.visible} all={all} query={f.query} />
      ) : (
        <JokeBoard shown={f.visible} all={all} query={f.query} />
      )}
    </div>
  )
}
