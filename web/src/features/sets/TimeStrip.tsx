/**
 * The Bird's eye view's time strip (docs/sets.md): the set to scale against the slot, above the
 * board. A lane for the beats, one per label field (Not sure hatched amber), the blocks, and the
 * jokes as numbered chips in their Vibe colour, edged yellow (locked) or teal (loose), with gates
 * as sky brackets. Only beats have time: blocks and jokes keep their order, in equal slots.
 * Tap a joke to find it on the board.
 */
import type { CSSProperties, ReactNode } from 'react'
import type { Beat, SetField } from '../../api/types'
import { Tape } from '../../components/ui/pieces'
import { clock } from '../../lib/duration'
import { NOT_SURE_COLOR, optionColor, washed } from '../../lib/labelColors'
import { beatName, hasReason, labelOf, needsWhy, statusField } from './beats'
import type { BoardData } from './BoardJoke'
import type { Strip } from './birdsEye'

const LABEL = 112
const hatch = (hex: string): CSSProperties => ({
  backgroundImage: `repeating-linear-gradient(135deg, ${hex}38 0 5px, transparent 5px 10px)`, color: hex, boxShadow: `inset 0 0 0 1px ${hex}73`,
})
const seg = 'absolute top-1 bottom-1 overflow-hidden rounded-md px-1.5 text-[11px] leading-[22px] whitespace-nowrap text-ellipsis'

function Lane({ name, height, width, children }: { name: string; height: number; width: number; children: ReactNode }) {
  return (
    <div className="flex border-b border-rule" style={{ height }}>
      <div className="sticky left-0 z-10 flex shrink-0 items-center border-r border-rule-strong bg-ink pr-2 text-[11.5px] leading-tight text-dim" style={{ width: LABEL }}>{name}</div>
      <div className="relative shrink-0" style={{ width }}>{children}</div>
    </div>
  )
}

interface Props { strip: Strip; pxPerSecond: number; slot: number; total: number; fields: SetField[]; data: BoardData; onPick: (pieceId: string) => void }

export function TimeStrip({ strip, pxPerSecond, slot, total, fields, data, onPick }: Props) {
  const { width } = strip
  const beats = strip.beats.map((s) => s.beat)
  const sf = statusField(fields)
  const shift = (b: Beat, i: number) => i > 0 && (hasReason(b) || needsWhy(beats, i, fields))
  return (
    <div className="mb-4 w-max overflow-hidden rounded-xl bg-ink ring-1 ring-rule-strong">
      <Lane name={`${clock(total)} of ${clock(slot)}`} height={40} width={width}>
        {strip.ticks.map((t) => <span key={t} className="absolute top-0 bottom-0 border-l border-rule pl-1 text-[10.5px] text-faint tabular" style={{ left: t * pxPerSecond }}>{clock(t)}</span>)}
        {total < slot && <div className={`${seg} top-[18px]`} style={{ left: total * pxPerSecond, width: (slot - total) * pxPerSecond, ...hatch(NOT_SURE_COLOR) }}>{clock(slot - total)} of the slot not planned yet</div>}
        {total > slot && <div className={`${seg} top-[18px] bg-light/20 text-light`} style={{ left: slot * pxPerSecond, width: (total - slot) * pxPerSecond }}>{clock(total - slot)} over</div>}
      </Lane>
      <Lane name="Beats" height={40} width={width}>
        {strip.beats.map((s) => <div key={s.beat.id} className="absolute top-2 overflow-hidden" style={{ left: s.x, width: Math.max(0, s.w - 4) }}><Tape seed={s.index} className="max-w-full truncate text-[13px]">{beatName(s.beat, s.index)}</Tape></div>)}
      </Lane>
      {fields.map((f) => (
        <Lane key={f.id} name={f.name} height={32} width={width}>
          {strip.beats.map((s) => {
            const o = labelOf(s.beat, f)
            return <div key={s.beat.id} className={seg} style={{ left: s.x, width: Math.max(0, s.w - 4), ...(o ? washed(optionColor(o)) : hatch(NOT_SURE_COLOR)) }}>{o?.label ?? 'Not sure'}</div>
          })}
          {f.id === sf?.id && strip.beats.map((s, i) => shift(s.beat, i) && (
            <span key={`why-${s.beat.id}`} className={`absolute -top-2 z-[5] -translate-x-1/2 rounded-full bg-ink px-1.5 text-[10px] ring-1 ${hasReason(s.beat) ? 'text-dim ring-rule-strong' : 'text-amber ring-amber/50'}`} style={{ left: s.x }}>
              {hasReason(s.beat) ? s.beat.shift_reason : 'Needs a reason'}
            </span>
          ))}
        </Lane>
      ))}
      <Lane name="Blocks, in order" height={32} width={width}>
        {strip.blocks.map((b) => {
          const e = b.entry
          const hex = e.kind === 'crowd' ? '#e7a3e0' : e.kind === 'jokes' ? '#ece6da' : e.gate ? '#9db4ff' : '#6fe86a'
          const name = e.kind === 'crowd' ? `Crowd work${e.title ? `: ${e.title}` : ''}` : e.kind === 'jokes' ? e.title?.trim() || 'Standalone' : (e.premise_id && data.premises.get(e.premise_id)?.take) || 'Premise'
          return <div key={e.id} title={name} className={seg} style={{ left: b.x, width: Math.max(0, b.w - 3), color: hex, backgroundColor: `${hex}1f`, boxShadow: `inset 0 0 0 1.5px ${hex}` }}>{name}</div>
        })}
      </Lane>
      <Lane name="Jokes, by Vibe" height={76} width={width}>
        {strip.blocks.flatMap((b) => [
          ...b.spans.map((g) => (
            <div key={`gate-${g.key}`} className="absolute rounded-t-md border-2 border-b-0 border-sky" style={{ left: g.from - 12, width: g.to - g.from + 24, top: g.depth ? 28 : 16, height: g.depth ? 14 : 26 }}>
              <span className="absolute -top-3.5 left-0.5 text-[9.5px] whitespace-nowrap text-sky">if {g.n} lands</span>
            </div>
          )),
          ...b.marks.map((m) => m.piece ? (
            <button key={m.key} type="button" onClick={() => onPick(m.key)} title={data.jokes.get(m.piece.joke_id)?.punchline}
              aria-label={`Joke ${data.number.get(m.key)}: find it on the board`}
              className={`absolute top-[44px] grid size-6 place-items-center rounded-md border-2 text-[11px] font-bold text-ink ${m.piece.loose ? 'border-dashed border-teal' : 'border-tape'}`}
              style={{ left: m.x - 12, ...data.vibe(data.jokes.get(m.piece.joke_id)?.persona).dot }}>{data.number.get(m.key)}</button>
          ) : (
            <span key={m.key} title={m.question} className="absolute top-[44px] grid size-6 place-items-center rounded-md bg-orchid text-[12px] font-bold text-ink" style={{ left: m.x - 12 }}>?</span>
          )),
        ])}
      </Lane>
    </div>
  )
}

export const STRIP_LABEL = LABEL
