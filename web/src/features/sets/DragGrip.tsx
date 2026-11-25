/**
 * The grip you drag a beat, block or joke by. Only the grip starts a drag (it takes touches
 * itself, `touch-none`), so a finger anywhere else on a row still scrolls the page. With a
 * keyboard: tab to it, Space to pick the row up, arrow keys, Space to drop, Escape to put it back.
 */
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { GripVertical } from 'lucide-react'

interface Props {
  label: string
  listeners: DraggableSyntheticListeners
  attributes: DraggableAttributes
  setRef: (el: HTMLElement | null) => void
}

export function DragGrip({ label, listeners, attributes, setRef }: Props) {
  return (
    <button type="button" ref={setRef} {...listeners} {...attributes} aria-label={`Drag to move ${label}`} title="Drag to move"
      className="inline-flex h-10 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-faint hover:text-paper active:cursor-grabbing pointer-coarse:h-11 pointer-coarse:w-9">
      <GripVertical size={17} />
    </button>
  )
}
