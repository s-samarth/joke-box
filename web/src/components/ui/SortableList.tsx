/**
 * A list you put in order by dragging the grip on each row. With a keyboard: tab to a grip,
 * Space or Enter to pick the row up, arrow keys to move it, Space or Enter to drop it (Escape
 * puts it back).
 *
 * dnd-kit does the dragging. `useSortable` gives each row a ref, the listeners for its grip, and
 * a `transform` that slides it while you drag; on drop we hand back the ids in their new order.
 * The rows only move up and down: the sideways part of the drag is ignored.
 */
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props<T extends { id: string }> {
  items: T[]
  /** Called on drop with every id, in the new order. */
  onReorder: (ids: string[]) => void
  /** Names the row for screen readers: "Drag to reorder Driving". */
  label: (item: T) => string
  /** The row's contents, after the grip. */
  children: (item: T) => ReactNode
  className?: string
  rowClassName?: string
}

export function SortableList<T extends { id: string }>({ items, onReorder, label, children, className = '', rowClassName = '' }: Props<T>) {
  const sensors = useSensors(
    // A small move (or, on a phone, a short hold) before a drag starts, so taps and scrolling still work.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const ids = items.map((i) => i.id)
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {items.map((item) => (
            <Row key={item.id} id={item.id} label={label(item)} className={rowClassName}>{children(item)}</Row>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

function Row({ id, label, className, children }: { id: string; label: string; className: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform && { ...transform, x: 0 }), transition }
  return (
    <li ref={setNodeRef} style={style} className={`${className} ${isDragging ? 'relative z-10 rounded-lg bg-ink-3 shadow-lift' : ''}`}>
      <div className="flex items-start gap-1">
        <button type="button" {...listeners} {...attributes} aria-label={`Drag to reorder ${label}`} title="Drag to reorder"
          className="flex h-10 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-faint hover:text-paper active:cursor-grabbing">
          <GripVertical size={17} />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </li>
  )
}
