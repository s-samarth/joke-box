/**
 * One joke in a set, as a strip of masking tape with marker writing. Drag by the handle,
 * or use the arrows. The runtime is the joke's own: editing it here changes the joke; opener and closer are noted on the strip, and
 * the joke's strength sits beside it. An optional joke (one to cut if time is short) is on
 * faded tape. Tap the strip to read the whole joke.
 */
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, CircleDashed, GripVertical, X } from 'lucide-react'
import { useState } from 'react'
import type { Joke } from '../../api/types'
import { StrengthTicks, Tape } from '../../components/ui/pieces'
import { clock, parse } from '../../lib/duration'
import type { DraftItem } from './setlistMath'

interface Props {
  item: DraftItem
  joke?: Joke
  index: number
  count: number
  note: 'Opener' | 'Closer' | null
  onDuration: (s: number) => void
  onOptional: () => void
  onMove: (to: number) => void
  onRemove: () => void
  onOpen: () => void
}

export function TapeRow({ item, joke, index, count, note, onDuration, onOptional, onMove, onRemove, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.jokeId })
  const [text, setText] = useState(clock(item.duration))
  // The runtime changed from outside (the joke edited elsewhere): show the new one. Setting state
  // while rendering is React's way to follow a prop; it re-renders straight away.
  const [shown, setShown] = useState(item.duration)
  if (shown !== item.duration) {
    setShown(item.duration)
    setText(clock(item.duration))
  }
  const tool = 'inline-flex size-8 items-center justify-center rounded-md text-faint hover:text-paper disabled:opacity-25'

  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`flex items-center gap-2 ${isDragging ? 'relative z-10' : ''}`}>
      <button type="button" {...listeners} {...attributes} aria-label="Drag to reorder" className="flex h-12 w-7 shrink-0 cursor-grab touch-none items-center justify-center text-faint"><GripVertical size={18} /></button>
      <button type="button" onClick={onOpen} disabled={!joke} aria-label={joke ? `Read the whole joke: ${joke.setup}` : 'Deleted joke'}
        className="min-w-0 flex-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-tape">
        <Tape seed={index} optional={item.optional} className={`px-4 py-2.5 transition hover:brightness-105 ${isDragging ? 'shadow-lift' : ''}`}>
          {(note || item.optional) && <span className="mr-2 text-sm opacity-60">{[note, item.optional && 'Optional'].filter(Boolean).join(', ')}:</span>}
          <span className="text-lg leading-tight">{joke?.setup ?? 'Deleted joke'}</span>
        </Tape>
      </button>
      {joke && <StrengthTicks strength={joke.strength} fill="bg-sky" />}
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <div className="flex items-center gap-0.5">
          <button type="button" aria-pressed={!!item.optional} onClick={onOptional} aria-label="Optional: cut it if time is short" title="Optional: cut it if time is short"
            className={`${tool} ${item.optional ? 'bg-ink-3 text-paper' : ''}`}><CircleDashed size={14} /></button>
          <input aria-label="Runtime" inputMode="numeric" value={text} onChange={(e) => setText(e.target.value)}
            onBlur={() => { const s = parse(text); if (s !== null && s !== item.duration) onDuration(s); setText(clock(s ?? item.duration)) }}
            className="h-8 w-14 rounded-md bg-ink-3 text-center text-[16px] tabular outline-none focus:ring-2 focus:ring-tape sm:text-sm" />
        </div>
        <div className="flex">
          <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => onMove(index - 1)} className={tool}><ArrowUp size={14} /></button>
          <button type="button" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(index + 1)} className={tool}><ArrowDown size={14} /></button>
          <button type="button" aria-label="Take out of set" onClick={onRemove} className={`${tool} hover:text-light`}><X size={14} /></button>
        </div>
      </div>
    </li>
  )
}
