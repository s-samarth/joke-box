/**
 * The drawing part of the joke board: topic islands, chain arrows and the boxes, scaled by `zoom`
 * like the map. Drag the background to move around (usePan), drag a box to move it
 * (useBoxDrag), tap a box to read it.
 *
 * With a lot of jokes, only the boxes near the part of the board on screen are drawn: the rest
 * would cost time and never be seen.
 */
import { useEffect, useId, useMemo, useState, type KeyboardEvent, type RefObject } from 'react'
import type { Joke, Topic } from '../../../api/types'
import { topicName } from '../../../lib/jokeMeta'
import { BoardBox, LABEL_ZOOM } from './BoardBox'
import type { Board } from './boardLayout'
import { NODE } from './mapLayout'
import { useBoxDrag } from './useBoxDrag'
import { usePan } from './usePan'

/** Past this many boxes, draw only the ones near the screen. */
const ALL_UP_TO = 300
const MARGIN = 400

interface Props {
  board: Board<Joke>
  topics: Topic[]
  zoom: number
  lit: number | null
  selected: string | null
  scroller: RefObject<HTMLDivElement | null>
  onSelect: (id: string) => void
  onLight: (chain: number | null) => void
  /** A box was moved by (dx, dy) on the board, by dragging or the arrow keys. */
  onMove: (id: string, dx: number, dy: number) => void
}

/** The part of the board on screen, in steps of 200px so scrolling redraws only now and then. */
function useView(scroller: RefObject<HTMLDivElement | null>) {
  const [view, setView] = useState({ left: 0, top: 0, w: 4000, h: 4000 })
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const step = (n: number) => Math.round(n / 200) * 200
    const read = () => {
      const next = { left: step(el.scrollLeft), top: step(el.scrollTop), w: step(el.clientWidth), h: step(el.clientHeight) }
      setView((v) => (v.left === next.left && v.top === next.top && v.w === next.w && v.h === next.h ? v : next))
    }
    read()
    el.addEventListener('scroll', read, { passive: true })
    window.addEventListener('resize', read)
    return () => {
      el.removeEventListener('scroll', read)
      window.removeEventListener('resize', read)
    }
  }, [scroller])
  return view
}

const STEP = { small: 16, big: 64 }
const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

export function BoardCanvas({ board, topics, zoom, lit, selected, scroller, onSelect, onLight, onMove }: Props) {
  const ids = useId()
  const pan = usePan(scroller)
  const view = useView(scroller)
  const { moving, handlers, justDragged } = useBoxDrag(zoom, scroller, onMove)
  const labels = zoom <= LABEL_ZOOM
  const near = (x: number, y: number) =>
    x + NODE.w > view.left / zoom - MARGIN && x < (view.left + view.w) / zoom + MARGIN && y + NODE.h > view.top / zoom - MARGIN && y < (view.top + view.h) / zoom + MARGIN
  const shown = board.boxes.length <= ALL_UP_TO ? board.boxes : board.boxes.filter((b) => near(b.x, b.y) || b.joke.id === selected || b.joke.id === moving?.id)
  const shift = (id: string) => (moving?.id === id ? { dx: moving.dx, dy: moving.dy } : { dx: 0, dy: 0 })
  const at = useMemo(() => new Map(board.boxes.map((b) => [b.joke.id, b])), [board])

  const keys = (id: string) => (e: KeyboardEvent) => {
    const dir = ARROWS[e.key]
    if (!dir) return
    e.preventDefault()
    const step = e.shiftKey ? STEP.big : STEP.small
    onMove(id, dir[0] * step, dir[1] * step)
  }

  return (
    <div ref={scroller} {...pan} className="max-h-[75dvh] cursor-grab overflow-auto rounded-2xl bg-ink-2/30 p-4 ring-1 ring-rule select-none active:cursor-grabbing">
      <div className="relative" style={{ width: board.width * zoom, height: board.height * zoom }}>
        <div className="absolute top-0 left-0 origin-top-left" style={{ width: board.width, height: board.height, transform: `scale(${zoom})` }}>
          {board.islands.map((i) => (
            <div key={i.topicId} className="absolute rounded-3xl bg-ink-2/50 ring-1 ring-rule" style={{ left: i.x, top: i.y, width: i.w, height: i.h }}>
              <p className={`px-6 pt-3 font-semibold text-dim ${labels ? 'text-[30px]' : 'text-[15px]'}`}>
                {topicName(topics.find((t) => t.id === i.topicId))} <span className="font-normal text-faint">{i.count}</span>
              </p>
            </div>
          ))}
          <svg width={board.width} height={board.height} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
            <defs>
              <marker id={`${ids}a`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-tape)" />
              </marker>
            </defs>
            {board.edges.map((e) => {
              const a = shift(e.from)
              const b = shift(e.to)
              const moved = a.dx || a.dy || b.dx || b.dy
              const dim = at.get(e.from)?.dim || at.get(e.to)?.dim
              return (
                <line key={`${e.from}${e.to}`} x1={e.x1 + a.dx} y1={e.y1 + a.dy} x2={e.x2 + b.dx} y2={e.y2 + b.dy} stroke="var(--color-tape)" strokeWidth={2}
                  strokeDasharray={dim ? '5 5' : undefined} markerEnd={`url(#${ids}a)`}
                  className={moved ? 'opacity-50' : `transition-opacity ${lit !== null && lit !== e.chain ? 'opacity-15' : 'opacity-75'}`} />
              )
            })}
          </svg>
          {shown.map((b) => {
            const { dx, dy } = shift(b.joke.id)
            return (
              <BoardBox key={b.joke.id} joke={b.joke} x={b.x + dx} y={b.y + dy} tilt={b.tilt} dim={b.dim} pinned={b.pinned} labels={labels}
                selected={b.joke.id === selected} dragging={moving?.id === b.joke.id} faded={lit !== null && b.chain !== lit}
                onClick={() => !justDragged() && onSelect(b.joke.id)} onKeyDown={keys(b.joke.id)}
                onMouseEnter={() => onLight(b.chain)} onMouseLeave={() => onLight(null)} onFocus={() => onLight(b.chain)} onBlur={() => onLight(null)}
                {...handlers(b.joke.id)} />
            )
          })}
        </div>
      </div>
    </div>
  )
}
