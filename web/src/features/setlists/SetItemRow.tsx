/** One bit in the set: drag handle, Opener/Closer label, editable duration, move and remove. */
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react'
import { useState } from 'react'
import type { Bit } from '../../api/types'
import { clock, parse } from '../../lib/duration'
import type { DraftItem } from './setlistMath'

interface Props {
  item: DraftItem
  bit?: Bit
  index: number
  label: 'Opener' | 'Closer' | null
  isFirst: boolean
  isLast: boolean
  onDuration: (seconds: number) => void
  onMove: (to: number) => void
  onRemove: () => void
}

export function SetItemRow({ item, bit, index, label, isFirst, isLast, onDuration, onMove, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.bitId })
  const [text, setText] = useState(clock(item.duration))
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <li ref={setNodeRef} style={style} className={`flex items-stretch gap-1 rounded-2xl bg-panel ring-1 ${isDragging ? 'z-10 ring-accent shadow-pop' : 'ring-line'}`}>
      {/* Only the handle starts a drag, so the list still scrolls normally on a phone. */}
      <button type="button" {...listeners} {...attributes} aria-label="Drag to reorder" className="flex w-9 shrink-0 cursor-grab touch-none items-center justify-center text-faint">
        <GripVertical size={18} />
      </button>
      <div className="min-w-0 flex-1 py-3">
        <div className="mb-1 flex items-center gap-2 text-xs">
          <span className="text-faint tabular">{index + 1}</span>
          {label && <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent">{label}</span>}
        </div>
        {/* Two lines, never truncated to one letter. */}
        <p className="line-clamp-2 text-sm leading-snug">{bit?.setup ?? 'Deleted bit'}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center gap-1 py-2 pr-1">
        <input
          aria-label="Duration"
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const seconds = parse(text)
            if (seconds !== null) onDuration(seconds)
            setText(clock(seconds ?? item.duration))
          }}
          className="h-9 w-16 rounded-lg bg-raised text-center text-[16px] tabular ring-1 ring-line outline-none focus:ring-accent sm:text-sm"
        />
        <div className="flex">
          <button type="button" aria-label="Move up" disabled={isFirst} onClick={() => onMove(index - 1)} className="inline-flex size-8 items-center justify-center rounded-lg text-faint hover:text-text disabled:opacity-30"><ChevronUp size={16} /></button>
          <button type="button" aria-label="Move down" disabled={isLast} onClick={() => onMove(index + 1)} className="inline-flex size-8 items-center justify-center rounded-lg text-faint hover:text-text disabled:opacity-30"><ChevronDown size={16} /></button>
          <button type="button" aria-label="Remove from set" onClick={onRemove} className="inline-flex size-8 items-center justify-center rounded-lg text-faint hover:text-danger"><X size={16} /></button>
        </div>
      </div>
    </li>
  )
}
