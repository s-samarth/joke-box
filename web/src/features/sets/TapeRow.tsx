/**
 * One bit in a set, as a strip of masking tape with marker writing. Drag by the handle,
 * or use the arrows. The runtime is editable; opener and closer are noted on the strip.
 */
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, GripVertical, X } from 'lucide-react'
import { useState } from 'react'
import type { Bit } from '../../api/types'
import { Tape } from '../../components/ui/bits'
import { clock, parse } from '../../lib/duration'
import type { DraftItem } from './setlistMath'

interface Props {
  item: DraftItem
  bit?: Bit
  index: number
  count: number
  note: 'Opener' | 'Closer' | null
  onDuration: (s: number) => void
  onMove: (to: number) => void
  onRemove: () => void
}

export function TapeRow({ item, bit, index, count, note, onDuration, onMove, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.bitId })
  const [text, setText] = useState(clock(item.duration))
  const tool = 'inline-flex size-8 items-center justify-center rounded-md text-faint hover:text-paper disabled:opacity-25'

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-2 ${isDragging ? 'relative z-10' : ''}`}>
      <button type="button" {...listeners} {...attributes} aria-label="Drag to reorder" className="flex h-12 w-7 shrink-0 cursor-grab touch-none items-center justify-center text-faint"><GripVertical size={18} /></button>
      <Tape seed={index} className={`min-w-0 flex-1 px-4 py-2.5 ${isDragging ? 'shadow-lift' : ''}`}>
        {note && <span className="mr-2 text-sm opacity-60">{note}:</span>}
        <span className="text-lg leading-tight">{bit?.setup ?? 'Deleted bit'}</span>
      </Tape>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <input aria-label="Runtime" inputMode="numeric" value={text} onChange={(e) => setText(e.target.value)}
          onBlur={() => { const s = parse(text); if (s !== null) onDuration(s); setText(clock(s ?? item.duration)) }}
          className="h-8 w-14 rounded-md bg-ink-3 text-center text-[16px] tabular outline-none focus:ring-2 focus:ring-tape sm:text-sm" />
        <div className="flex">
          <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => onMove(index - 1)} className={tool}><ArrowUp size={14} /></button>
          <button type="button" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(index + 1)} className={tool}><ArrowDown size={14} /></button>
          <button type="button" aria-label="Take out of set" onClick={onRemove} className={`${tool} hover:text-light`}><X size={14} /></button>
        </div>
      </div>
    </li>
  )
}
