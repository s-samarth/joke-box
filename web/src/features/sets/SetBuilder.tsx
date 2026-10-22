/**
 * Building a set: the set itself as tape strips you reorder, the slot length as the light bar,
 * and your bits beside it (desktop) or in a sheet (phone). Saves itself as you go.
 */
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ArrowLeft, GraduationCap, Play, Plus, Printer } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useBits } from '../../api/library'
import { useSetlists, useVenues } from '../../api/shows'
import type { Bit, Setlist } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { EmptyState, Spinner } from '../../components/ui/bits'
import { Field, GrowingText, Input } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { clock, parse } from '../../lib/duration'
import { BitPeek } from '../bits/BitPeek'
import { CraftSheet } from '../craft/CraftSheet'
import { AddBits } from './AddBits'
import { LightBar } from './LightBar'
import { SetMeta } from './SetMeta'
import { draftItems, move, optionalSeconds, positionLabel, totalSeconds } from './setlistMath'
import { TapeRow } from './TapeRow'
import { useAutosaveSet } from './useAutosaveSet'

function DropArea({ empty, children }: { empty: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'set' })
  return (
    <div ref={setNodeRef} className={`rounded-xl transition ${isOver ? 'bg-tape/10 ring-2 ring-tape/50' : ''} ${empty ? 'border border-dashed border-rule-strong p-8 text-center text-dim' : ''}`}>
      {empty ? 'Nothing taped down yet. Add jokes to start the set.' : children}
    </div>
  )
}

function Builder({ setlist }: { setlist: Setlist }) {
  const { draft, update } = useAutosaveSet(setlist)
  const { data: bits = [] } = useBits()
  const { data: venues = [] } = useVenues()
  const [picking, setPicking] = useState(false)
  const [reading, setReading] = useState<Bit | null>(null)
  const [craft, setCraft] = useState(false)
  const [target, setTarget] = useState(clock(draft.target_seconds))
  const byId = new Map(bits.map((b) => [b.id, b]))
  const used = new Set(draft.items.map((i) => i.bit_id))
  const items = draftItems(draft.items)
  const total = totalSeconds(items)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const add = (bit: Bit, at?: number) =>
    !used.has(bit.id) && update((d) => {
      const list = [...d.items]
      list.splice(at ?? list.length, 0, { bit_id: bit.id, duration_seconds: bit.duration_seconds, optional: false })
      return { ...d, items: list }
    })
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return
    const id = String(active.id)
    const to = draft.items.findIndex((i) => i.bit_id === over.id)
    if (id.startsWith('lib:')) {
      const bit = byId.get(id.slice(4))
      if (bit) add(bit, to >= 0 ? to : undefined)
      return
    }
    const from = draft.items.findIndex((i) => i.bit_id === id)
    if (from >= 0 && to >= 0 && from !== to) update((d) => ({ ...d, items: move(d.items, from, to) }))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div className="mx-auto flex max-w-6xl gap-10">
        <div className="min-w-0 flex-1 pb-10">
          <div className="flex h-12 items-center justify-between gap-2 lg:mt-6">
            <Link to="/sets" className="inline-flex items-center gap-1.5 text-dim hover:text-paper"><ArrowLeft size={18} /> Sets</Link>
            <div className="flex gap-1">
              <button type="button" onClick={() => setCraft(true)} aria-label="Notes on building a set" title="Notes on building a set" className="inline-flex size-10 items-center justify-center rounded-lg text-dim hover:bg-ink-3 hover:text-paper"><GraduationCap size={18} /></button>
              <Link to={`/sets/${setlist.id}/print`} aria-label="Print" className="inline-flex size-10 items-center justify-center rounded-lg text-dim hover:bg-ink-3 hover:text-paper"><Printer size={18} /></Link>
              <Link to={`/sets/${setlist.id}/stage`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-tape px-3 font-semibold text-tape-ink"><Play size={16} /> Rehearse</Link>
            </div>
          </div>
          <GrowingText aria-label="Set name" className="headline mt-4 text-[44px] sm:text-[56px]" value={draft.name} placeholder="Untitled set"
            onChange={(e) => update((d) => ({ ...d, name: e.target.value }))} />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Show date"><Input type="date" value={draft.show_date ?? ''} onChange={(e) => update((d) => ({ ...d, show_date: e.target.value || null }))} /></Field>
            <Field label="Slot length">
              <Input inputMode="numeric" className="tabular" value={target} onChange={(e) => setTarget(e.target.value)}
                onBlur={() => { const s = parse(target); if (s) update((d) => ({ ...d, target_seconds: s })); setTarget(clock(s || draft.target_seconds)) }} />
            </Field>
            <div className="col-span-2 sm:col-span-1">
              <Field label="Venue">
                <Input list="jb-venues" placeholder="Where?" value={draft.venue_name ?? ''} onChange={(e) => update((d) => ({ ...d, venue_name: e.target.value || null }))} />
                <datalist id="jb-venues">{venues.map((v) => <option key={v.id} value={v.name} />)}</datalist>
              </Field>
            </div>
          </div>
          <SetMeta draft={draft} update={update} />
          <div className="mt-8"><LightBar total={total} optional={optionalSeconds(items)} target={draft.target_seconds} big /></div>
          <div className="mt-8">
            <SortableContext items={items.map((i) => i.bitId)} strategy={verticalListSortingStrategy}>
              <DropArea empty={items.length === 0}>
                <ol className="space-y-3">
                  {items.map((item, i) => (
                    <TapeRow key={item.bitId} item={item} bit={byId.get(item.bitId)} index={i} count={items.length} note={items.length > 1 ? positionLabel(i, items.length) : null}
                      onDuration={(s) => update((d) => ({ ...d, items: d.items.map((x) => (x.bit_id === item.bitId ? { ...x, duration_seconds: s } : x)) }))}
                      onOptional={() => update((d) => ({ ...d, items: d.items.map((x) => (x.bit_id === item.bitId ? { ...x, optional: !x.optional } : x)) }))}
                      onMove={(to) => update((d) => ({ ...d, items: move(d.items, i, to) }))}
                      onRemove={() => update((d) => ({ ...d, items: d.items.filter((x) => x.bit_id !== item.bitId) }))}
                      onOpen={() => setReading(byId.get(item.bitId) ?? null)} />
                  ))}
                </ol>
              </DropArea>
            </SortableContext>
          </div>
          <div className="mt-5 lg:hidden"><Button className="w-full" icon={<Plus size={18} />} onClick={() => setPicking(true)}>Add jokes</Button></div>
        </div>
        <aside className="sticky top-0 hidden h-dvh w-80 shrink-0 flex-col py-10 lg:flex">
          <h2 className="headline mb-3 text-2xl">Your jokes</h2>
          <AddBits used={used} onAdd={(b) => add(b)} onOpen={setReading} draggable />
        </aside>
      </div>
      <Modal open={picking} onOpenChange={setPicking} title="Add jokes" description={`${items.length} in the set, ${clock(total)} so far`}>
        <div className="h-[62dvh]"><AddBits used={used} onAdd={(b) => add(b)} onOpen={setReading} /></div>
      </Modal>
      <CraftSheet open={craft} onOpenChange={setCraft} title="Building a set" screen="sets" empty="No notes in the areas that show on the set builder." />
      {reading && <BitPeek bit={reading} onClose={() => setReading(null)} onAdd={() => add(reading)} inSet={used.has(reading.id)} />}
    </DndContext>
  )
}

export function SetBuilder() {
  const { setId } = useParams()
  const { data: sets, isPending } = useSetlists()
  const setlist = sets?.find((s) => s.id === setId)
  if (isPending && !sets) return <div className="py-16"><Spinner /></div>
  if (!setlist) return <EmptyState title="Set not found" action={<Link to="/sets" className="text-tape">Back to sets</Link>}>It may have been deleted.</EmptyState>
  return <Builder key={setlist.id} setlist={setlist} />
}
