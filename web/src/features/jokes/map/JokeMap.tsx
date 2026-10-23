/**
 * The joke map: the jokes the list is showing, with chains drawn as boxes joined by arrows from
 * each joke to the one that follows it, and jokes in no chain in a grid underneath.
 *
 * Tapping a box opens it in a panel beside the map (MapPeek) and lights up its chain; the panel's
 * "Comes after" and "Followed by" walk along the chain, scrolling the map to each joke.
 */
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Joke } from '../../../api/types'
import { IconButton } from '../../../components/ui/Button'
import { layoutMap, NODE } from './mapLayout'
import { MapBox } from './MapBox'
import { MapCanvas } from './MapCanvas'
import { MapPeek } from './MapPeek'

const ZOOMS = [0.4, 0.55, 0.7, 0.85, 1, 1.2]

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function summary(chains: number, linked: number, singles: number) {
  if (!chains) return singles ? `No chains yet. ${plural(singles, 'joke stands', 'jokes stand')} on its own.` : ''
  const lone = singles ? `, and ${plural(singles, 'joke', 'jokes')} on their own` : ''
  return `${plural(chains, 'chain', 'chains')} of ${plural(linked, 'joke', 'jokes')}${lone}. Tap a joke to read it; drag or scroll to move around.`
}

export function JokeMap({ shown, all, query }: { shown: Joke[]; all: Joke[]; query: string }) {
  const map = useMemo(() => layoutMap(shown, all), [shown, all])
  const byId = useMemo(() => new Map(all.map((j) => [j.id, j])), [all])
  const chainOf = useMemo(() => new Map(map.nodes.map((n) => [n.joke.id, n.chain])), [map])
  // A phone starts zoomed out, so more than one box fits across.
  const [zoom, setZoom] = useState(() => (window.innerWidth < 640 ? 0.7 : 1))
  const [hovered, setHovered] = useState<number | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const joke = selected ? byId.get(selected) : undefined
  const lit = hovered ?? (selected ? chainOf.get(selected) ?? null : null)

  useEffect(() => {
    if (!selected) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setSelected(null)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [selected])

  const step = (dir: 1 | -1) => setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, ZOOMS.findIndex((x) => x >= z - 0.001) + dir))])
  const fit = () => {
    const room = (scroller.current?.clientWidth ?? 0) - 32
    setZoom(Math.max(ZOOMS[0], Math.min(1, room / map.width)))
  }
  /** Open a joke in the panel and bring its box into view. */
  const pick = (id: string) => {
    setSelected(id)
    setTimeout(() => document.querySelector(`[data-joke="${id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-xl">
          <h2 className="headline text-4xl">Joke map</h2>
          <p className="mt-1 text-sm text-dim">{summary(map.chains, map.nodes.length, map.singles.length)}</p>
        </div>
        {map.chains > 0 && (
          <div className="flex items-center gap-1 rounded-lg bg-ink-2 p-1 ring-1 ring-rule">
            <IconButton label="Zoom out" disabled={zoom <= ZOOMS[0]} onClick={() => step(-1)}><ZoomOut size={17} /></IconButton>
            <span className="w-12 text-center text-sm tabular text-dim">{Math.round(zoom * 100)}%</span>
            <IconButton label="Zoom in" disabled={zoom >= ZOOMS[ZOOMS.length - 1]} onClick={() => step(1)}><ZoomIn size={17} /></IconButton>
            <IconButton label="Fit to width" onClick={fit}><Maximize2 size={16} /></IconButton>
          </div>
        )}
      </div>

      {map.chains > 0 ? (
        <MapCanvas map={map} zoom={zoom} lit={lit} selected={selected} onSelect={pick} onLight={setHovered} scroller={scroller} />
      ) : (
        shown.length > 0 && (
          <p className="max-w-md text-[15px] leading-relaxed text-dim">
            To draw a chain, open a joke and pick the joke it follows under <span className="text-paper">Follows</span>, or tap <span className="text-paper">Write the next joke</span> on it.
          </p>
        )
      )}

      {map.singles.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm text-dim">On their own <span className="text-faint">{map.singles.length}</span></h3>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${NODE.w}px), 1fr))` }}>
            {map.singles.map((j) => <MapBox key={j.id} joke={j} selected={j.id === selected} onSelect={() => pick(j.id)} />)}
          </div>
        </section>
      )}

      {joke && (
        <MapPeek joke={joke} query={query} onPick={pick} onClose={() => setSelected(null)}
          before={joke.follows_id ? byId.get(joke.follows_id) : undefined}
          beforeGone={Boolean(joke.follows_id && !byId.has(joke.follows_id))}
          after={all.filter((j) => j.follows_id === joke.id).sort((a, b) => a.created_at.localeCompare(b.created_at))} />
      )}
    </div>
  )
}
