/**
 * The joke map as a screen. On desktop it fills the space beside the list when no joke is open;
 * /jokes/map opens it on its own, which is how a phone gets to it. It maps whatever the list is
 * showing, since the filters live in the URL.
 */
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { useJokes } from '../../../api/library'
import { EmptyState, Spinner } from '../../../components/ui/pieces'
import { useJokeFilters } from '../useJokeFilters'
import { JokeMap } from './JokeMap'

export function JokeMapPage({ own = false }: { own?: boolean }) {
  const f = useJokeFilters()
  const { data: all = [] } = useJokes()
  return (
    <div className="pt-2 pb-16 lg:pt-10">
      {own && (
        <Link to={`/jokes${f.query ? `?${f.query}` : ''}`} className="inline-flex h-12 items-center gap-1.5 text-dim hover:text-paper lg:hidden">
          <ArrowLeft size={18} /> Jokes
        </Link>
      )}
      {f.isPending ? (
        <div className="py-16"><Spinner /></div>
      ) : f.visible.length === 0 ? (
        <EmptyState title="Nothing to map">{f.active ? 'No jokes match these filters. Clear them to see the whole map.' : 'Write a joke and it shows up here.'}</EmptyState>
      ) : (
        <JokeMap shown={f.visible} all={all} query={f.query} />
      )}
    </div>
  )
}
