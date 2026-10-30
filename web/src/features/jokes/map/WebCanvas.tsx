/**
 * The drawing part of the premise web: a frame per premise with its topic, the premise card in the
 * middle, spokes out to its jokes, and arrows where one joke follows another. Scaled by `zoom`
 * like the map; drag the background or scroll to move around.
 */
import { Lightbulb } from 'lucide-react'
import { useId, type RefObject } from 'react'
import { Link } from 'react-router'
import type { Premise } from '../../../api/premises'
import type { Joke, Topic } from '../../../api/types'
import { topicName } from '../../../lib/jokeMeta'
import { premiseSize } from '../../../lib/premises'
import { MapBox } from './MapBox'
import { usePan } from './usePan'
import { CARD, type Web } from './webLayout'

interface Props {
  webs: Web<Joke, Premise>[]
  width: number
  height: number
  topics: Topic[]
  zoom: number
  selected: string | null
  onSelect: (id: string) => void
  scroller: RefObject<HTMLDivElement | null>
}

export function WebCanvas({ webs, width, height, topics, zoom, selected, onSelect, scroller }: Props) {
  const ids = useId()
  const pan = usePan(scroller)
  return (
    <div ref={scroller} {...pan} className="max-h-[75dvh] cursor-grab overflow-auto rounded-2xl bg-ink-2/30 p-4 ring-1 ring-rule select-none active:cursor-grabbing">
      <div className="relative" style={{ width: width * zoom, height: height * zoom }}>
        <div className="absolute top-0 left-0 origin-top-left" style={{ width, height, transform: `scale(${zoom})` }}>
          {webs.map((w) => (
            <div key={w.premise.id} className="absolute rounded-3xl bg-ink-2/50 ring-1 ring-rule" style={{ left: w.x, top: w.y, width: w.w, height: w.h }}>
              <p className="px-6 pt-3 text-[15px] font-semibold text-dim">{topicName(topics.find((t) => t.id === w.premise.topic_id))}</p>
            </div>
          ))}
          <svg width={width} height={height} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
            <defs>
              <marker id={`${ids}a`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-tape)" />
              </marker>
            </defs>
            {webs.flatMap((w) => w.lines).map((l) => (
              <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke={l.kind === 'chain' ? 'var(--color-tape)' : 'var(--color-rule-strong)'} strokeWidth={2}
                strokeDasharray={l.dim ? '5 5' : undefined} markerEnd={l.kind === 'chain' ? `url(#${ids}a)` : undefined}
                className={l.dim ? 'opacity-50' : 'opacity-80'} />
            ))}
          </svg>
          {webs.map((w) => (
            <Link key={w.premise.id} to={`/premises/${w.premise.id}`} style={{ position: 'absolute', left: w.card.x, top: w.card.y, width: CARD.w, height: CARD.h }}
              className="flex flex-col justify-between rounded-2xl border-2 border-tape/70 bg-ink-3 p-4 text-left shadow-lift hover:border-tape">
              <span className="flex gap-2">
                <Lightbulb size={18} className="mt-0.5 shrink-0 text-tape" aria-hidden />
                <span className="line-clamp-3 text-[16px] leading-snug font-medium text-paper">{w.premise.take}</span>
              </span>
              <span className="text-xs text-dim">{premiseSize(w.nodes.length)}</span>
            </Link>
          ))}
          {webs.flatMap((w) => w.nodes).map((n) => (
            <MapBox key={n.joke.id} joke={n.joke} at={n} dim={n.dim} selected={n.joke.id === selected} onSelect={() => onSelect(n.joke.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}
