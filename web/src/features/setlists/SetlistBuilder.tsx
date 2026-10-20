/**
 * Build a timed set. dnd-kit handles dragging with one setup for mouse, touch and keyboard:
 * drag bits from the library into the set, or drag rows by their handle to reorder.
 */
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ListMusic, Mic2, Plus, Printer, Save } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useBits } from '../../api/library'
import { useSetlistActions } from '../../api/shows'
import type { Bit, Setlist } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'
import { todayIst } from '../../lib/time'
import { LibraryPanel } from './LibraryPanel'
import { SetHeader, type SetMeta } from './SetHeader'
import { SetItemRow } from './SetItemRow'
import { move, positionLabel, totalSeconds, type DraftItem } from './setlistMath'

function DropZone({ empty, children }: { empty: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'set' })
  return (
    <div ref={setNodeRef} className={`min-h-40 rounded-2xl p-2 transition ${isOver ? 'bg-accent-soft ring-2 ring-accent/50' : empty ? 'ring-1 ring-dashed ring-line-strong' : ''}`}>
      {empty ? <p className="flex h-36 items-center justify-center text-sm text-faint">Drag bits here, or tap + to add</p> : children}
    </div>
  )
}

export function SetlistBuilder({ id, existing }: { id: string; existing?: Setlist }) {
  const { data: bits = [] } = useBits()
  const { save } = useSetlistActions()
  const { toast } = useFeedback()
  const navigate = useNavigate()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [meta, setMeta] = useState<SetMeta>({
    name: existing?.name ?? 'Untitled Setlist',
    showDate: existing?.show_date ?? todayIst(),
    venueName: existing?.venue_name ?? '',
    targetSeconds: existing?.target_seconds ?? 900,
  })
  const [items, setItems] = useState<DraftItem[]>(existing?.items.map((i) => ({ bitId: i.bit_id, duration: i.duration_seconds })) ?? [])
  const byId = new Map(bits.map((b) => [b.id, b]))
  const inSet = new Set(items.map((i) => i.bitId))
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const add = (bit: Bit, at = items.length) =>
    !inSet.has(bit.id) && setItems((list) => [...list.slice(0, at), { bitId: bit.id, duration: bit.duration_seconds }, ...list.slice(at)])

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return
    const activeId = String(active.id)
    const overIndex = items.findIndex((i) => i.bitId === over.id)
    if (activeId.startsWith('lib:')) {
      const bit = byId.get(activeId.slice(4))
      if (bit) add(bit, overIndex >= 0 ? overIndex : items.length)
      return
    }
    const from = items.findIndex((i) => i.bitId === activeId)
    if (from >= 0 && overIndex >= 0 && from !== overIndex) setItems((list) => move(list, from, overIndex))
  }

  const onSave = () =>
    save.mutate(
      { id, input: { name: meta.name.trim() || 'Untitled Setlist', show_date: meta.showDate || null, target_seconds: meta.targetSeconds, venue_name: meta.venueName.trim() || null, items: items.map((i) => ({ bit_id: i.bitId, duration_seconds: i.duration })) } },
      { onSuccess: () => toast('Setlist saved'), onError: (e) => toast(`Not saved: ${e.message}`) },
    )
  const openView = (view: 'stage' | 'print') => (existing ? navigate(`/setlist/${id}/${view}`) : toast('Save the setlist first'))

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 pt-5 sm:px-6 lg:pt-8">
        <aside className="hidden h-[calc(100dvh-4rem)] w-80 shrink-0 flex-col lg:sticky lg:top-8 lg:flex">
          <h2 className="mb-3 text-xs font-medium tracking-wide text-muted uppercase">Bit library</h2>
          <LibraryPanel inSet={inSet} onAdd={(b) => add(b)} />
        </aside>
        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/setlist" className="mr-auto inline-flex h-10 items-center gap-1.5 text-sm text-muted hover:text-text"><ListMusic size={16} /> Saved<span className="hidden sm:inline"> setlists</span></Link>
            <Button size="sm" variant="ghost" icon={<Printer size={16} />} onClick={() => openView('print')}><span className="hidden sm:inline">Print</span></Button>
            <Button size="sm" icon={<Mic2 size={16} />} onClick={() => openView('stage')}>Stage<span className="hidden sm:inline"> view</span></Button>
            <Button size="sm" variant="primary" icon={<Save size={16} />} onClick={onSave} disabled={save.isPending}>Save</Button>
          </div>
          <SetHeader meta={meta} onChange={setMeta} total={totalSeconds(items)} />
          <div className="lg:hidden">
            <Button className="w-full" icon={<Plus size={18} />} onClick={() => setPickerOpen(true)}>Add bits</Button>
          </div>
          <SortableContext items={items.map((i) => i.bitId)} strategy={verticalListSortingStrategy}>
            <DropZone empty={items.length === 0}>
              <ol className="space-y-2">
                {items.map((item, index) => (
                  <SetItemRow
                    key={item.bitId}
                    item={item}
                    bit={byId.get(item.bitId)}
                    index={index}
                    label={positionLabel(index, items.length)}
                    isFirst={index === 0}
                    isLast={index === items.length - 1}
                    onDuration={(d) => setItems((list) => list.map((i) => (i.bitId === item.bitId ? { ...i, duration: d } : i)))}
                    onMove={(to) => setItems((list) => move(list, index, to))}
                    onRemove={() => setItems((list) => list.filter((i) => i.bitId !== item.bitId))}
                  />
                ))}
              </ol>
            </DropZone>
          </SortableContext>
        </div>
      </div>
      <Modal open={pickerOpen} onOpenChange={setPickerOpen} title="Add bits" description={`${items.length} in set`}>
        <div className="h-[65dvh]"><LibraryPanel inSet={inSet} onAdd={(b) => add(b)} /></div>
      </Modal>
    </DndContext>
  )
}
