/**
 * The drawing part of the joke map: boxes placed by mapLayout, arrows in one SVG under them, all
 * scaled by `zoom` inside a wrapper sized to the scaled drawing, so the scrollbars stay right.
 *
 * Move around by scrolling, or with a mouse by dragging the map. A drag that ends on a box
 * doesn't count as a tap on it. On a touch screen the finger already scrolls, so dragging is
 * left to the browser.
 */
import { useId, useMemo, useRef, type MouseEvent, type PointerEvent, type RefObject } from 'react'
import type { Joke } from '../../../api/types'
import type { MapEdge, MapLayout } from './mapLayout'
import { MapBox } from './MapBox'

/** A gentle S from the right of one box to the left of the next, so branches fan out. */
const curve = ({ x1, y1, x2, y2 }: MapEdge) => `M ${x1} ${y1} C ${x1 + 28} ${y1}, ${x2 - 28} ${y2}, ${x2 - 2} ${y2}`

function usePan(ref: RefObject<HTMLDivElement | null>) {
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null)
  return {
    onPointerDown: (e: PointerEvent) => {
      const el = ref.current
      if (!el || e.pointerType !== 'mouse' || e.button !== 0) return
      drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false }
    },
    onPointerMove: (e: PointerEvent) => {
      const d = drag.current
      const el = ref.current
      if (!d || !el) return
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return
      if (!d.moved) el.setPointerCapture(e.pointerId)
      d.moved = true
      el.scrollLeft = d.left - dx
      el.scrollTop = d.top - dy
    },
    // The click after a drag comes straight after this, so the flag is cleared just after it.
    onPointerUp: () => setTimeout(() => { drag.current = null }),
    onClickCapture: (e: MouseEvent) => {
      if (!drag.current?.moved) return
      e.preventDefault()
      e.stopPropagation()
    },
  }
}

interface Props {
  map: MapLayout<Joke>
  zoom: number
  /** The chain to light up; the others step back. */
  lit: number | null
  selected: string | null
  onSelect: (id: string) => void
  onLight: (chain: number | null) => void
  scroller: RefObject<HTMLDivElement | null>
}

export function MapCanvas({ map, zoom, lit, selected, onSelect, onLight, scroller }: Props) {
  const ids = useId()
  const pan = usePan(scroller)
  const dimIds = useMemo(() => new Set(map.nodes.filter((n) => n.dim).map((n) => n.joke.id)), [map])
  return (
    <div ref={scroller} {...pan} className="max-h-[70dvh] cursor-grab overflow-auto rounded-2xl bg-ink-2/40 p-4 ring-1 ring-rule select-none active:cursor-grabbing">
      <div className="relative" style={{ width: map.width * zoom, height: map.height * zoom }}>
        <div className="absolute top-0 left-0 origin-top-left" style={{ width: map.width, height: map.height, transform: `scale(${zoom})` }}>
          <svg width={map.width} height={map.height} className="absolute inset-0 overflow-visible" aria-hidden>
            <defs>
              {(['tape', 'faint'] as const).map((c) => (
                <marker key={c} id={`${ids}${c}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={`var(--color-${c})`} />
                </marker>
              ))}
            </defs>
            {map.edges.map((e) => {
              const c = dimIds.has(e.from) || dimIds.has(e.to) ? 'faint' : 'tape'
              return (
                <path key={`${e.from}${e.to}`} d={curve(e)} fill="none" stroke={`var(--color-${c})`} strokeWidth={2} strokeDasharray={c === 'faint' ? '5 5' : undefined}
                  markerEnd={`url(#${ids}${c})`} className={`transition-opacity ${lit !== null && lit !== e.chain ? 'opacity-20' : 'opacity-80'}`} />
              )
            })}
          </svg>
          {map.nodes.map((n) => (
            <MapBox key={n.joke.id} joke={n.joke} at={n} dim={n.dim} selected={n.joke.id === selected}
              faded={lit !== null && lit !== n.chain} onSelect={() => onSelect(n.joke.id)} onLight={(on) => onLight(on ? n.chain : null)} />
          ))}
        </div>
      </div>
    </div>
  )
}
