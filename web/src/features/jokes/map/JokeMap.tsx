/**
 * The joke map: the jokes the list is showing, with chains drawn as boxes joined by arrows from
 * each joke to the one that follows it, and jokes in no chain in a grid underneath.
 *
 * Tapping a box opens it in a panel beside the map (MapPeek) and lights up its chain; the panel's
 * "Comes after" and "Followed by" walk along the chain, scrolling the map to each joke.
 */
import { useMemo, useRef, useState } from 'react'
import type { Joke } from '../../../api/types'
import { layoutMap, NODE } from './mapLayout'
import { MapBox } from './MapBox'
import { MapCanvas } from './MapCanvas'
import { PeekOf } from './MapPeek'
import { useSelection } from './useSelection'
import { ZoomControls } from './ZoomControls'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function summary(chains: number, linked: number, singles: number) {
  if (!chains) return singles ? `No chains yet. ${plural(singles, 'joke stands on its own', 'jokes stand on their own')}.` : ''
  const lone = singles ? `, and ${plural(singles, 'joke', 'jokes')} on their own` : ''
  return `${plural(chains, 'chain', 'chains')} of ${plural(linked, 'joke', 'jokes')}${lone}. Tap a joke to read it; drag or scroll to move around.`
}

export function JokeMap({ shown, all, query }: { shown: Joke[]; all: Joke[]; query: string }) {
  const map = useMemo(() => layoutMap(shown, all), [shown, all])
  const chainOf = useMemo(() => new Map(map.nodes.map((n) => [n.joke.id, n.chain])), [map])
  // A phone starts zoomed out, so more than one box fits across.
  const [zoom, setZoom] = useState(() => (window.innerWidth < 640 ? 0.7 : 1))
  const [hovered, setHovered] = useState<number | null>(null)
  const { selected, pick, close } = useSelection()
  const scroller = useRef<HTMLDivElement>(null)
  const lit = hovered ?? (selected ? chainOf.get(selected) ?? null : null)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-sm text-dim">{summary(map.chains, map.nodes.length, map.singles.length)}</p>
        {map.chains > 0 && (
          <ZoomControls zoom={zoom} onZoom={setZoom} width={map.width} room={() => scroller.current?.clientWidth ?? 0} />
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

      <PeekOf id={selected} all={all} query={query} onPick={pick} onClose={close} />
    </div>
  )
}
