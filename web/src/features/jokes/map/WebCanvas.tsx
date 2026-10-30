/**
 * The drawing part of the premise web: a frame per premise with its topic, the premise card in green
 * in the middle, arrows flowing out from it to each joke, and yellow arrows where one joke follows
 * another. Scaled by `zoom`
 * like the map; drag the background or scroll to move around.
 */
import { Lightbulb } from 'lucide-react'
import { useId, type RefObject } from 'react'
import { Link } from 'react-router'
import type { Premise } from '../../../api/premises'
import type { Joke, Topic } from '../../../api/types'
import { topicName } from '../../../lib/jokeMeta'
import { premiseSize } from '../../../lib/premises'
import { usePan } from './usePan'
import { WebBox } from './WebBox'
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
            <div key={w.premise.id} className="absolute rounded-[2rem] border-2 border-rule bg-ink-2/40" style={{ left: w.x, top: w.y, width: w.w, height: w.h }}>
              <p className="px-7 pt-4 text-[20px] font-semibold text-dim">{topicName(topics.find((t) => t.id === w.premise.topic_id))}</p>
            </div>
          ))}
          <svg width={width} height={height} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
            <defs>
              {(['ok', 'tape'] as const).map((c) => (
                <marker key={c} id={`${ids}${c}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={`var(--color-${c})`} />
                </marker>
              ))}
            </defs>
            {webs.flatMap((w) => w.lines).map((l) => (
              <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeLinecap="round"
                stroke={`var(--color-${l.kind === 'chain' ? 'tape' : 'ok'})`} strokeWidth={3}
                strokeDasharray={l.dim ? '6 7' : undefined} markerEnd={`url(#${ids}${l.kind === 'chain' ? 'tape' : 'ok'})`}
                className={l.dim ? 'opacity-35' : l.kind === 'chain' ? 'opacity-90' : 'opacity-60'} />
            ))}
          </svg>
          {webs.map((w) => (
            <Link key={w.premise.id} to={`/premises/${w.premise.id}`} style={{ position: 'absolute', left: w.card.x, top: w.card.y, width: CARD.w, height: CARD.h }}
              className="flex flex-col justify-between rounded-3xl border-[3px] border-ok bg-[color-mix(in_srgb,var(--color-ok)_16%,var(--color-ink-2))] p-5 text-left shadow-lift transition-colors hover:bg-[color-mix(in_srgb,var(--color-ok)_24%,var(--color-ink-2))]">
              <span className="flex gap-2.5">
                <Lightbulb size={22} className="mt-0.5 shrink-0 text-ok" aria-hidden />
                <span className="line-clamp-3 text-[19px] leading-snug font-semibold text-paper">{w.premise.take}</span>
              </span>
              <span className="text-[13px] font-medium text-ok">{premiseSize(w.nodes.length)}</span>
            </Link>
          ))}
          {webs.flatMap((w) => w.nodes).map((n) => (
            <WebBox key={n.joke.id} joke={n.joke} x={n.x} y={n.y} dim={n.dim} selected={n.joke.id === selected} onSelect={() => onSelect(n.joke.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}
