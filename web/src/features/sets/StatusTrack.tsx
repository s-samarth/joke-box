/**
 * The status track: your status field drawn across the set by beat time. One row per option,
 * a tape-yellow line through the beats. A Not sure beat is a dotted grey line at the level
 * before it; where it changes, "Turn · reason" ("Turn: why?" in amber with none yet) or "Shift".
 * A labelled stretch over the top-up limit is shaded amber.
 */
import type { ReactNode } from 'react'
import type { Beat, SetField } from '../../api/types'
import { clock } from '../../lib/duration'
import { type Analysis, changeNote } from './beats'

const COLOUR = { win: 'var(--color-ok)', neutral: 'var(--color-sky)', loss: 'var(--color-amber)' }

export function StatusTrack({ beats, field, fields, analysis, limit }: { beats: Beat[]; field: SetField; fields: SetField[]; analysis: Analysis; limit: number }) {
  const opts = field.options
  const W = 1000, L = 170, R = 16, T = 42, rh = 28
  const H = T + rh * Math.max(1, opts.length) + 30
  const total = Math.max(analysis.total, 60)
  const x = (t: number) => L + (t / total) * (W - L - R)
  const y = (i: number) => T + i * rh + 10
  const parts: ReactNode[] = []
  let t = 0, d = '', prev: number | null = null
  beats.forEach((b, i) => {
    const x0 = x(t), x1 = x(t + b.seconds)
    parts.push(
      <g key={`b${b.id}`}>
        <line x1={x0} x2={x0} y1={T - (i % 2 ? 30 : 16)} y2={T + rh * opts.length - 6} stroke="var(--color-rule-strong)" />
        <text x={x0 + 4} y={T - (i % 2 ? 20 : 6)} fontSize="12.5" fontWeight="700" fill="var(--color-paper)">{b.cue || `Beat ${i + 1}`}</text>
      </g>,
    )
    const oi = opts.findIndex((o) => o.id === b.labels[field.id])
    if (oi < 0) {
      const yy = prev !== null ? y(prev) : T + (rh * (opts.length - 1)) / 2 + 10
      parts.push(
        <g key={`n${b.id}`}>
          <line x1={x0} x2={x1} y1={yy} y2={yy} stroke="var(--color-dim)" strokeWidth="2.5" strokeDasharray="2 6" strokeLinecap="round" />
          <text x={(x0 + x1) / 2} y={yy - 8} textAnchor="middle" fontSize="11.5" fill="var(--color-dim)">Not sure</text>
        </g>,
      )
    } else {
      if (prev !== null) d += `M${x0} ${y(prev)} L${x0} ${y(oi)} `
      d += `M${x0} ${y(oi)} L${x1} ${y(oi)} `
      prev = oi
      const note = changeNote(beats, i, fields)
      if (note) parts.push(<text key={`w${b.id}`} x={x0} y={H - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill={note.open ? 'var(--color-amber)' : 'var(--color-faint)'}>{note.text}</text>)
    }
    t += b.seconds
  })
  const worst = analysis.known.seconds > limit ? analysis.known.span : null
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full min-w-[620px]" role="img" aria-label={`${field.name} across the set, by beat time`}>
        {opts.map((o, i) => (
          <g key={o.id}>
            <text x={L - 10} y={y(i) + 4} textAnchor="end" fontSize="12.5" fill={COLOUR[o.group ?? 'neutral']}>{o.label}</text>
            <line x1={L} x2={W - R} y1={y(i)} y2={y(i)} stroke="var(--color-rule)" />
          </g>
        ))}
        {worst && <rect x={x(worst[0])} y={T - 6} width={x(worst[1]) - x(worst[0])} height={rh * opts.length} fill="rgb(255 181 71 / 0.08)" />}
        {parts}
        <path d={d} fill="none" stroke="var(--color-tape)" strokeWidth="3" strokeLinecap="round" />
        <text x={x(total)} y={H - 6} textAnchor="end" fontSize="11.5" fill="var(--color-faint)">{clock(analysis.total)}</text>
      </svg>
    </div>
  )
}
