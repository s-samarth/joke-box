/**
 * The spine: the set's beats in their fixed order, as tape strips with their cue and time. This
 * is the part you memorise. Tap a beat to open it; drag it by its grip, or step it with the arrows.
 */
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import type { Beat, SetField } from '../../api/types'
import { Tape } from '../../components/ui/pieces'
import { clock } from '../../lib/duration'
import { hasReason, labelOf, needsWhy } from './beats'
import { DragGrip } from './DragGrip'

interface Props {
  beats: Beat[]
  fields: SetField[]
  selected: string | null
  onSelect: (id: string) => void
  onMove: (i: number, d: number) => void
  /** Every beat id, in the new order. */
  onReorder: (ids: string[]) => void
  onAdd: () => void
}

const icon = 'inline-flex size-8 pointer-coarse:size-11 items-center justify-center rounded-md text-faint hover:bg-ink-3 hover:text-paper disabled:opacity-30'

function contents(b: Beat) {
  const premises = b.entries.filter((e) => e.kind === 'premise').length
  const jokes = b.entries.reduce((n, e) => n + (e.kind === 'crowd' ? 0 : e.pieces.length), 0)
  const crowd = b.entries.some((e) => e.kind === 'crowd')
  return [premises && `${premises} ${premises === 1 ? 'premise' : 'premises'}`, `${jokes} ${jokes === 1 ? 'joke' : 'jokes'}`, crowd && 'crowd work'].filter(Boolean).join(' · ')
}

export function Spine({ beats, fields, selected, onSelect, onMove, onReorder, onAdd }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = beats.map((b) => b.id)
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }
  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={beats.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2" aria-label="Beats, in running order">
            {beats.map((b, i) => (
              <SpineBeat key={b.id} beat={b} i={i} last={i === beats.length - 1} flag={needsWhy(beats, i, fields) && !hasReason(b)} fields={fields}
                selected={selected === b.id} onSelect={() => onSelect(b.id)} onMove={(d) => onMove(i, d)} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      <button type="button" onClick={onAdd} className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-rule-strong text-dim hover:text-paper">
        <Plus size={16} /> Add beat
      </button>
    </div>
  )
}

interface BeatProps { beat: Beat; i: number; last: boolean; flag: boolean; fields: SetField[]; selected: boolean; onSelect: () => void; onMove: (d: number) => void }

function SpineBeat({ beat: b, i, last, flag, fields, selected, onSelect, onMove }: BeatProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: b.id })
  const style = { transform: CSS.Transform.toString(transform && { ...transform, x: 0 }), transition }
  const name = b.cue || `beat ${i + 1}`
  return (
    <li ref={setNodeRef} style={style} className={`flex items-start gap-1 rounded-xl p-2 ring-1 transition-colors ${selected ? 'bg-ink-2 ring-tape/60' : 'ring-rule hover:bg-ink-2/60'} ${isDragging ? 'relative z-10 bg-ink-3 shadow-lift' : ''}`}>
      <DragGrip label={name} listeners={listeners} attributes={attributes} setRef={setActivatorNodeRef} />
      <button type="button" onClick={onSelect} aria-current={selected} className="min-w-0 flex-1 text-left">
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
        <button type="button" className={icon} disabled={i === 0} onClick={() => onMove(-1)} aria-label={`Move ${name} earlier`}><ArrowUp size={15} /></button>
        <button type="button" className={icon} disabled={last} onClick={() => onMove(1)} aria-label={`Move ${name} later`}><ArrowDown size={15} /></button>
      </span>
    </li>
  )
}
