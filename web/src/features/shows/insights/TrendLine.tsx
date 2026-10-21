/**
 * Your rating over your last ten shows, after every show: one gold line, with a grey hairline for
 * your overall rating. Hover (or focus and use the arrow keys) to read any point; the latest value
 * is labelled at the end of the line.
 */
import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatDate } from '../../../lib/time'
import type { TrendPoint } from './timelineMath'
import { TipBox } from './TipBox'
import { useTip, useWidth } from './useTip'
import { RATING_COLORS } from './vizColors'

const H = 180
const PAD = { top: 12, right: 36, bottom: 24, left: 28 }
/** More than this between shows and the line breaks instead of drawing a straight bridge over the gap. */
const GAP = 30 * 24 * 3600_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function TrendLine({ data, usual, window }: { data: TrendPoint[]; usual: number; window: number }) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const { box, tip, show, hide } = useTip()
  const [active, setActive] = useState<number | null>(null)

  const times = data.map((p) => new Date(p.at).getTime())
  const [t0, t1] = [times[0], times[times.length - 1]]
  const values = [...data.map((p) => p.rating), usual]
  // Whole stars around the data, at least two apart, so small wobbles don't look like cliffs.
  let lo = Math.max(1, Math.floor(Math.min(...values)))
  let hi = Math.min(5, Math.ceil(Math.max(...values)))
  if (hi - lo < 2) [lo, hi] = hi + 1 <= 5 ? [Math.max(1, hi - 1), hi + 1] : [3, 5]
  const plotW = Math.max(0, width - PAD.left - PAD.right)
  const x = (t: number) => PAD.left + (t1 === t0 ? plotW : ((t - t0) / (t1 - t0)) * plotW)
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom)
  // Runs of shows without a long break; each gets its own line and wash.
  const runs: number[][] = []
  times.forEach((t, i) => (i && t - times[i - 1] <= GAP ? runs[runs.length - 1].push(i) : runs.push([i])))
  const line = (run: number[]) => run.map((i, k) => `${k ? 'L' : 'M'}${x(times[i]).toFixed(1)},${y(data[i].rating).toFixed(1)}`).join('')
  const wash = (run: number[]) => `${line(run)}L${x(times[run[run.length - 1]]).toFixed(1)},${y(lo)}L${x(times[run[0]]).toFixed(1)},${y(lo)}Z`

  // Month ticks: the 1st of each month between the first and last point.
  const ticks: { t: number; label: string }[] = []
  const start = new Date(t0)
  for (let m = start.getUTCMonth() + (start.getUTCDate() > 1 ? 1 : 0); ; m++) {
    const t = Date.UTC(start.getUTCFullYear(), m, 1)
    if (t > t1) break
    ticks.push({ t, label: MONTHS[new Date(t).getUTCMonth()] })
  }
  const every = Math.ceil(ticks.length / Math.max(1, Math.floor(plotW / 48)))

  const pick = (i: number, el: Element) => {
    setActive(i)
    const p = data[i]
    show(el, `${p.rating.toFixed(1)} stars`, [`Last ${window} shows up to ${formatDate(p.at)}`])
  }
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const left = e.currentTarget.getBoundingClientRect().left
    const t = t0 + ((e.clientX - left - PAD.left) / Math.max(1, plotW)) * (t1 - t0)
    let best = 0
    times.forEach((tt, i) => { if (Math.abs(tt - t) < Math.abs(times[best] - t)) best = i })
    pick(best, e.currentTarget.querySelector(`[data-i="${best}"]`) ?? e.currentTarget)
  }
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const i = Math.min(data.length - 1, Math.max(0, (active ?? data.length - 1) + (e.key === 'ArrowRight' ? 1 : -1)))
    pick(i, e.currentTarget.querySelector(`[data-i="${i}"]`) ?? e.currentTarget)
  }
  const leave = () => { setActive(null); hide() }
  const last = data[data.length - 1]

  return (
    <div ref={box} className="relative">
      <div ref={ref}>
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label={`Rating over your last ${window} shows, now ${last.rating.toFixed(1)} stars`}
            tabIndex={0} onPointerMove={onMove} onPointerLeave={leave} onKeyDown={onKey} onBlur={leave} className="block outline-none focus-visible:ring-2 focus-visible:ring-tape">
            {Array.from({ length: hi - lo + 1 }, (_, k) => lo + k).map((v) => (
              <g key={v}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--color-rule)" />
                <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" className="fill-faint text-[11px] tabular">{v}★</text>
              </g>
            ))}
            <line x1={PAD.left} x2={width - PAD.right} y1={y(usual)} y2={y(usual)} stroke="var(--color-dim)" strokeOpacity={0.5} />
            <text x={PAD.left + 4} y={y(usual) - 5} className="fill-dim text-[11px]">Your usual {usual.toFixed(1)}</text>
            {ticks.map((k, i) => i % every === 0 && (
              <text key={k.t} x={x(k.t)} y={H - 6} textAnchor="middle" className="fill-faint text-[11px]">{k.label}</text>
            ))}
            {runs.map((run) => <path key={run[0]} d={wash(run)} fill={RATING_COLORS[4]} fillOpacity={0.08} />)}
            {runs.map((run) => <path key={run[0]} d={line(run)} fill="none" stroke={RATING_COLORS[4]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />)}
            {data.map((p, i) => <circle key={p.at + i} data-i={i} cx={x(times[i])} cy={y(p.rating)} r={i === active ? 5 : 0} fill={RATING_COLORS[4]} stroke="var(--color-ink-2)" strokeWidth={2} />)}
            {active !== null && <line x1={x(times[active])} x2={x(times[active])} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--color-rule-strong)" />}
            <circle cx={x(t1)} cy={y(last.rating)} r={4} fill={RATING_COLORS[4]} stroke="var(--color-ink-2)" strokeWidth={2} />
            <text x={x(t1) + 8} y={y(last.rating) + 4} className="fill-paper text-xs font-semibold tabular">{last.rating.toFixed(1)}</text>
          </svg>
        )}
      </div>
      <TipBox tip={tip} />
    </div>
  )
}
