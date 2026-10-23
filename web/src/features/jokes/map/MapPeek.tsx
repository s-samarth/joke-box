/**
 * The joke you tapped on the map, read in full without leaving it: its words, strength and type,
 * and the jokes either side of it in its chain, which you can tap to walk along the chain.
 * A panel rather than a sheet, so the map stays usable behind it.
 */
import { ArrowLeft, ArrowRight, ExternalLink, X } from 'lucide-react'
import { Link } from 'react-router'
import type { Joke } from '../../../api/types'
import { IconButton } from '../../../components/ui/Button'
import { StrengthTicks, TypeLabel } from '../../../components/ui/pieces'
import { displayTypes } from '../../../lib/jokeMeta'

interface Props {
  joke: Joke
  before?: Joke
  /** The joke it follows is in the Trash. */
  beforeGone: boolean
  after: Joke[]
  query: string
  onPick: (id: string) => void
  onClose: () => void
}

function Neighbour({ joke, dir, onPick }: { joke: Joke; dir: 'before' | 'after'; onPick: (id: string) => void }) {
  const Icon = dir === 'before' ? ArrowLeft : ArrowRight
  return (
    <button type="button" onClick={() => onPick(joke.id)} className="flex w-full items-start gap-2 rounded-lg bg-ink-3 px-3 py-2 text-left text-sm leading-snug hover:bg-ink-4">
      <Icon size={15} className="mt-0.5 shrink-0 text-tape" aria-hidden />
      <span className="line-clamp-2">{joke.setup}</span>
    </button>
  )
}

/** The panel for the joke with this id, with its neighbours looked up in `all`. */
export function PeekOf({ id, all, query, onPick, onClose }: { id: string | null; all: Joke[]; query: string; onPick: (id: string) => void; onClose: () => void }) {
  const joke = id ? all.find((j) => j.id === id) : undefined
  if (!joke) return null
  const before = joke.follows_id ? all.find((j) => j.id === joke.follows_id) : undefined
  const after = all.filter((j) => j.follows_id === joke.id).sort((a, b) => a.created_at.localeCompare(b.created_at))
  return <MapPeek joke={joke} before={before} beforeGone={Boolean(joke.follows_id && !before)} after={after} query={query} onPick={onPick} onClose={onClose} />
}

function MapPeek({ joke, before, beforeGone, after, query, onPick, onClose }: Props) {
  return (
    <aside aria-label="The joke"
      className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 flex max-h-[48dvh] flex-col rounded-2xl bg-ink-2 shadow-lift ring-1 ring-rule-strong lg:inset-x-auto lg:right-6 lg:bottom-6 lg:max-h-[70dvh] lg:w-[23rem]">
      <div className="flex items-center justify-between gap-2 border-b border-rule py-1.5 pr-1.5 pl-4">
        <Link to={`/jokes/${joke.id}${query ? `?${query}` : ''}`} className="inline-flex h-9 items-center gap-1.5 text-sm text-tape hover:underline">
          Open joke <ExternalLink size={14} />
        </Link>
        <IconButton label="Close" onClick={onClose}><X size={18} /></IconButton>
      </div>
      <div className="min-h-0 space-y-4 overflow-y-auto px-4 py-4">
        <div>
          <p className="text-[17px] leading-snug font-medium whitespace-pre-wrap">{joke.setup}</p>
          {joke.punchline && <p className="mt-2 text-[17px] leading-snug whitespace-pre-wrap text-tape">{joke.punchline}</p>}
          {joke.tag_lines.filter((t) => t.trim()).map((t, i) => (
            <p key={i} className="mt-1.5 flex gap-2 leading-snug text-dim"><span className="text-tape" aria-hidden>+</span>{t}</p>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StrengthTicks strength={joke.strength} />
          {displayTypes(joke.types).map((t) => <TypeLabel key={t} name={t} />)}
        </div>
        {(before || beforeGone) && (
          <section className="space-y-1.5">
            <h3 className="text-xs text-faint">Comes after</h3>
            {before ? <Neighbour joke={before} dir="before" onPick={onPick} /> : <p className="text-sm text-dim">A joke in the Trash</p>}
          </section>
        )}
        {after.length > 0 && (
          <section className="space-y-1.5">
            <h3 className="text-xs text-faint">Followed by</h3>
            {after.map((b) => <Neighbour key={b.id} joke={b} dir="after" onPick={onPick} />)}
          </section>
        )}
        {!before && !beforeGone && !after.length && <p className="text-sm text-dim">Not linked to another joke yet. Open it to pick the joke it follows.</p>}
      </div>
    </aside>
  )
}
