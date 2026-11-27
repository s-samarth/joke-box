/**
 * The Bird's eye view's board (docs/sets.md): one column per beat, left to right in running order.
 * A column's head has the cue, its time (the bar against the longest beat, in the status colour)
 * and every label; then its blocks in order: a premise in leaf green (sky blue when it needs the
 * premise before it to land), Standalone jokes in white with their title, crowd work in orchid.
 * Between columns sits how the status changes: a turn with its reason (amber when it has none
 * yet), or a shift; nothing when it stays the same. Bridges are
 * grey boxes under the joke or block they follow; like everything inside a beat, they have no time.
 */
import { ArrowRight } from 'lucide-react'
import type { Beat, SetEntry, SetField } from '../../api/types'
import { Tape } from '../../components/ui/pieces'
import { clock } from '../../lib/duration'
import { NOT_SURE_COLOR, optionColor, washed } from '../../lib/labelColors'
import { beatName, changeNote, labelOf, statusField } from './beats'
import { BridgeNotes } from './BridgeBoxes'
import { spoken } from './bridges'
import { COLUMN, GUTTER, boardWidth } from './birdsEye'
import { type BoardData, GenericChip, JokeRows, StatusTag, VibeChip } from './BoardJoke'
import { rowsOf } from './gateRows'

const eyebrow = 'text-[10.5px] font-semibold tracking-[0.12em] uppercase'

export function LabelChip({ field, beat }: { field: SetField; beat: Beat }) {
  const o = labelOf(beat, field)
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-px text-[11px] whitespace-nowrap" style={washed(optionColor(o))}>
      <span className="size-1.5 rounded-full" style={{ backgroundColor: optionColor(o) }} />{o?.label ?? 'Not sure'}
    </span>
  )
}

function Block({ entry, data }: { entry: SetEntry; data: BoardData }) {
  if (entry.kind === 'crowd') return (
    <section className="rounded-lg border-l-4 border-orchid p-2 ring-[1.5px] ring-orchid">
      <p className={`${eyebrow} text-orchid`}>Crowd work</p>
      {entry.title && <p className="mt-0.5 text-[13px] font-medium text-orchid">{entry.title}</p>}
      {entry.questions.map((q) => (
        <div key={q.id} className="mt-1.5 rounded-md bg-ink-3 p-1.5">
          <p className="text-[12.5px] leading-snug font-medium text-orchid">? {q.text || 'A question'}{' '}
            <span className={`ml-0.5 rounded-full px-1.5 text-[10.5px] font-normal ${q.has_reply ? 'bg-ok/15 text-ok' : 'bg-amber/15 text-amber'}`}>{q.has_reply ? 'Have a reply' : 'No reply yet'}</span>
          </p>
          {q.replies.map((r) => <p key={r.id} className="mt-0.5 ml-2 text-[11px] leading-snug text-dim">if they say {r.when} <span className="text-paper">→ {r.line}</span></p>)}
        </div>
      ))}
    </section>
  )
  const rows = <JokeRows rows={rowsOf(entry.pieces)} data={data} />
  if (entry.kind === 'jokes') return (
    <section className="rounded-lg border-l-4 border-paper p-2 ring-[1.5px] ring-paper/70">
      <p className={`${eyebrow} text-faint`}>Standalone</p>
      {entry.title?.trim() && <p className="mt-0.5 mb-1 text-[13px] font-semibold text-paper">{entry.title.trim()}</p>}
      <div className="mt-1">{rows}</div>
    </section>
  )
  const premise = entry.premise_id ? data.premises.get(entry.premise_id) : undefined
  const tint = entry.gate ? 'text-sky' : 'text-leaf'
  return (
    <section className={`rounded-lg border-l-4 p-2 ring-[1.5px] ${entry.gate ? 'border-sky bg-sky/5 ring-sky' : 'border-leaf ring-leaf'}`}>
      <p className={`${eyebrow} ${tint}`}>Premise{entry.gate && <span className="ml-1 font-medium tracking-normal normal-case">· only if the premise before landed</span>}</p>
      <p className={`mt-0.5 text-[13px] leading-snug font-semibold ${tint}`}>{premise?.take ?? 'This premise was deleted. Its jokes stay.'}</p>
      {premise && <div className="mt-1 mb-1.5 flex flex-wrap gap-1"><VibeChip id={premise.persona} data={data} /><GenericChip generic={premise.generic} /><StatusTag status={premise.status} /></div>}
      {rows}
    </section>
  )
}

function Column({ beat, index, longest, fields, data }: { beat: Beat; index: number; longest: number; fields: SetField[]; data: BoardData & { start: number } }) {
  const sf = statusField(fields)
  const bar = sf ? optionColor(labelOf(beat, sf)) : NOT_SURE_COLOR
  return (
    <article className="shrink-0 rounded-xl bg-ink-2 p-2.5 ring-1 ring-rule-strong" style={{ width: COLUMN }}>
      <div className="flex flex-col items-center gap-1 pt-1 text-center">
        <span className="text-[12px] font-semibold tracking-[0.12em] text-faint uppercase tabular">Beat {index + 1}</span>
        <Tape seed={index} className="max-w-full truncate px-3 text-[26px] leading-10">{beatName(beat, index)}</Tape>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded bg-ink-4"><div className="h-full rounded" style={{ width: `${longest ? (beat.seconds / longest) * 100 : 0}%`, backgroundColor: bar }} /></div>
      <p className="mt-1 text-center text-[12px] text-faint tabular">{clock(beat.seconds)} · {clock(data.start)} → {clock(data.start + beat.seconds)}</p>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 text-[11px] text-faint">
        {fields.map((f) => <div key={f.id} className="contents"><dt className="max-w-28 truncate" title={f.name}>{f.name}</dt><dd className="min-w-0"><LabelChip field={f} beat={beat} /></dd></div>)}
      </dl>
      {beat.description && <p className="mt-2 text-[12px] leading-snug whitespace-pre-line text-dim">{beat.description}</p>}
      <div className="mt-2.5 space-y-2">
        {beat.entries.length === 0 && <p className="text-[12px] text-faint">Nothing in this beat yet.</p>}
        {beat.entries.map((e) => <div key={e.id}><Block entry={e} data={data} /><BridgeNotes bridges={spoken(e)} className="mt-1.5" /></div>)}
      </div>
    </article>
  )
}

export function BeatBoard({ beats, starts, fields, data }: { beats: Beat[]; starts: number[]; fields: SetField[]; data: BoardData }) {
  const longest = Math.max(0, ...beats.map((b) => b.seconds))
  return (
    <div className="flex items-start" style={{ width: boardWidth(beats.length) }}>
      {beats.map((b, i) => {
        const note = changeNote(beats, i, fields)
        return (
          <div key={b.id} className="flex items-start">
            {i > 0 && (
              <div className="flex shrink-0 flex-col items-center gap-2 pt-6 text-faint" style={{ width: GUTTER }}>
                <ArrowRight size={16} aria-hidden />
                {note && <span className={`text-[12px] [writing-mode:vertical-rl] ${note.open ? 'text-amber' : 'text-dim'}`}>{note.text}</span>}
              </div>
            )}
            <Column beat={b} index={i} longest={longest} fields={fields} data={{ ...data, start: starts[i] ?? 0 }} />
          </div>
        )
      })}
    </div>
  )
}
