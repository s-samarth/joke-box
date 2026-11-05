/**
 * The joke map and the premise web. /jokes/map and /jokes/web give one the whole screen under the
 * Jokes header (see ViewSwitch). On a wide screen with no joke open, the one you used last also
 * sits beside the list, with a way to open it full size. Both show whatever the list is showing,
 * since the filters live in the URL.
 *
 * Map draws chains left to right; Web puts each premise in the middle of its jokes.
 */
import { Maximize2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useJokes } from '../../../api/library'
import { EmptyState, Spinner } from '../../../components/ui/pieces'
import { useJokeFilters } from '../useJokeFilters'
import { JokeMap } from './JokeMap'
import { JokeWeb } from './JokeWeb'
import { saveView, savedView, type JokeView } from './savedView'

const TITLES: Record<JokeView, { tab: string; title: string }> = {
  map: { tab: 'Map', title: 'Joke map' },
  web: { tab: 'Web', title: 'Premise web' },
}

/** The map or the web itself, for the jokes the filters leave. */
export function JokeMapView({ view }: { view: JokeView }) {
  const f = useJokeFilters()
  const { data: all = [] } = useJokes()
  useEffect(() => saveView(view), [view])
  if (f.isPending) return <div className="py-16"><Spinner /></div>
  if (f.visible.length === 0) {
    return <EmptyState title="Nothing here">{f.active ? 'No jokes match these filters. Clear them to see everything.' : 'Write a joke and it shows up here.'}</EmptyState>
  }
  return view === 'map'
    ? <JokeMap shown={f.visible} all={all} query={f.query} />
    : <JokeWeb shown={f.visible} all={all} query={f.query} everything={!f.active} />
}

/** /jokes/map and /jokes/web: the whole screen, under the Jokes header and filters. */
export const JokeMapScreen = ({ view }: { view: JokeView }) => <div className="pt-2 pb-16"><JokeMapView view={view} /></div>

/** Beside the list on a wide screen, with nothing open. */
export function JokeMapAside() {
  const { query } = useJokeFilters()
  const [view, setView] = useState<JokeView>(savedView)
  const full = `Open the ${TITLES[view].title.toLowerCase()} full size`
  return (
    <div className="pt-10 pb-16">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="headline text-4xl">{TITLES[view].title}</h2>
        <div className="flex items-center gap-1">
          <div role="tablist" aria-label="Map or web" className="flex rounded-lg bg-ink-3 p-0.5 text-sm">
            {(Object.keys(TITLES) as JokeView[]).map((v) => (
              <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
                className={`h-8 rounded-md px-3 ${view === v ? 'bg-ink-4 text-paper' : 'text-dim hover:text-paper'}`}>{TITLES[v].tab}</button>
            ))}
          </div>
          <Link to={`/jokes/${view}${query ? `?${query}` : ''}`} viewTransition aria-label={full} title={full}
            className="inline-flex size-9 items-center justify-center rounded-lg text-dim transition-colors hover:bg-ink-3 hover:text-paper">
            <Maximize2 size={17} />
          </Link>
        </div>
      </div>
      <JokeMapView view={view} />
    </div>
  )
}
