/**
 * The spine: the set's beats in their fixed order, as tape strips with their cue and time. This
 * is the part you memorise. Tap a beat to open it; the arrows move it.
 */
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import type { Beat, SetField } from '../../api/types'
import { Tape } from '../../components/ui/pieces'
import { clock } from '../../lib/duration'
import { hasReason, labelOf, needsWhy } from './beats'

interface Props {
  beats: Beat[]
  fields: SetField[]
  selected: string | null
  onSelect: (id: string) => void
  onMove: (i: number, d: number) => void
  onAdd: () => void
}

const icon = 'inline-flex size-8 pointer-coarse:size-11 items-center justify-center rounded-md text-faint hover:bg-ink-3 hover:text-paper disabled:opacity-30'

function contents(b: Beat) {
  const premises = b.entries.filter((e) => e.kind === 'premise').length
  const jokes = b.entries.reduce((n, e) => n + (e.kind === 'crowd' ? 0 : e.pieces.length), 0)
  const crowd = b.entries.some((e) => e.kind === 'crowd')
  return [premises && `${premises} ${premises === 1 ? 'premise' : 'premises'}`, `${jokes} ${jokes === 1 ? 'joke' : 'jokes'}`, crowd && 'crowd work'].filter(Boolean).join(' · ')
}

export function Spine({ beats, fields, selected, onSelect, onMove, onAdd }: Props) {
  return (
    <div>
      <ol className="space-y-2" aria-label="Beats, in running order">
        {beats.map((b, i) => {
          const flag = needsWhy(beats, i, fields) && !hasReason(b)
          return (
            <li key={b.id} className={`flex items-start gap-1 rounded-xl p-2 ring-1 transition-colors ${selected === b.id ? 'bg-ink-2 ring-tape/60' : 'ring-rule hover:bg-ink-2/60'}`}>
              <button type="button" onClick={() => onSelect(b.id)} aria-current={selected === b.id} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-3">
                  <Tape seed={i} dim={!b.cue} className="max-w-[70%] truncate text-lg">{b.cue || `Beat ${i + 1}`}</Tape>
                  <span className="ml-auto text-sm text-dim tabular">{clock(b.seconds)}</span>
                </div>
                <p className="mt-2 flex flex-wrap gap-1">
                  {fields.map((f) => {
                    const o = labelOf(b, f)
                    return <span key={f.id} className={`rounded-full px-2 py-0.5 text-[12px] ${o ? 'bg-ink-3 text-dim' : 'text-faint ring-1 ring-rule'}`}>{o?.label ?? 'Not sure'}</span>
                  })}
                  {flag && <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[12px] font-semibold text-amber">Why the shift?</span>}
                </p>
                <p className="mt-1 text-[12.5px] text-faint">{contents(b)}</p>
              </button>
              <span className="flex flex-col">
                <button type="button" className={icon} disabled={i === 0} onClick={() => onMove(i, -1)} aria-label={`Move ${b.cue || `beat ${i + 1}`} earlier`}><ArrowUp size={15} /></button>
                <button type="button" className={icon} disabled={i === beats.length - 1} onClick={() => onMove(i, 1)} aria-label={`Move ${b.cue || `beat ${i + 1}`} later`}><ArrowDown size={15} /></button>
              </span>
            </li>
          )
        })}
      </ol>
      <button type="button" onClick={onAdd} className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-rule-strong text-dim hover:text-paper">
        <Plus size={16} /> Add beat
      </button>
    </div>
  )
}
