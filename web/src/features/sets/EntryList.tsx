/**
 * A beat's list, in order: premises with their jokes, jokes with no premise (they can sit
 * between premises), and crowd work. Blocks and jokes move by drag or by the arrows
 * (docs/sets.md, "Drag and arrows"). Drags and moves change only the set: a joke's premise in
 * your library stays as it is.
 * Jokes first, premise later: Select in a no-premise list ticks jokes to put under a premise.
 * Move on a joke does what a drag does, by name, in two parts: No premise (a new block of its own
 * just below, or another No premise block) and Under a premise (another premise block in the beat,
 * or any premise, picked in SetPickers).
 */
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Beat, SetEntry } from '../../api/types'
import { useFeedback } from '../../components/ui/feedbackContext'
import type { MenuRow } from '../../components/ui/Menu'
import { setEntries } from './beatEdit'
import { moveEntry, spotOf } from './beatMove'
import { hasPieces } from './beats'
import { DragPreview } from './DragPreview'
import { EntryBlock, type BlockProps } from './EntryBlock'
import { dropEmptied, moveChoices, moveTo, type MoveChoice, type MoveTo } from './moveTo'
import { short, usePremiseTake } from './usePremiseTake'
import { entryKey, useBeatDrag } from './useBeatDrag'

interface Props extends BlockProps {
  onGroup: (entryId: string, pieceIds: string[]) => void
  onMoveToPremise: (pieceId: string) => void
}

export function EntryList({ beat, onChange, onGroup, onMoveToPremise, ...rest }: Props) {
  const { toast } = useFeedback()
  const takeOf = usePremiseTake()
  const [selecting, setSelecting] = useState<{ entryId: string; ids: string[] } | null>(null)
  const latest = useRef(beat) // Undo puts it back into the beat as it is by then
  useEffect(() => { latest.current = beat })

  const drop = (next: Beat) => onChange(setEntries(next, dropEmptied(beat, next).entries))
  // Move only moves it in the set. Taken out of a premise, the toast says the library keeps it.
  const move = (pieceId: string, to: MoveTo, label: string) => {
    const next = moveTo(beat, pieceId, to)
    if (next === beat) return
    const before = beat
    const from = beat.entries.find((e) => e.id === spotOf(beat, pieceId)?.entryId)
    onChange(setEntries(next, next.entries))
    const left = from?.kind === 'premise' && !next.entries.some((e) => e.kind === 'premise' && e.premise_id === from.premise_id && e.pieces.some((p) => p.id === pieceId))
    toast(left ? `Out of “${short(takeOf(from.premise_id) ?? 'the premise', 40)}” in this set. Your library stays as it is.` : label.startsWith('Into') ? `Moved ${label.replace(/^Into/, 'into')}` : 'Moved into a new standalone block', { label: 'Undo', onClick: () => onChange(before) })
  }
  // Move: two plain parts, so a joke can always go out on its own with no premise, or under any premise.
  const moveItems = (pieceId: string): MenuRow[] => {
    const { none, premise } = moveChoices(beat, pieceId, takeOf)
    const item = (c: MoveChoice) => ({ label: c.label, onSelect: () => move(pieceId, c.to, c.label) })
    return [
      ...(none.length ? [{ heading: 'Standalone' }, ...none.map(item), 'divider' as const] : []),
      { heading: 'Under a premise' }, ...premise.map(item),
      { label: premise.length ? 'Another premise…' : 'Pick a premise…', onSelect: () => onMoveToPremise(pieceId) },
    ]
  }
  const { shown, active, context } = useBeatDrag(beat, drop)
  // A held block folds every block to its heading: keep the one in your hand where it was.
  const heldTop = useRef<{ id: string; top: number } | null>(null)
  const folding = active?.kind === 'entry' ? active.entryId : null
  const where = (id: string) => document.querySelector(`[data-entry="${CSS.escape(id)}"]`)?.getBoundingClientRect().top
  const start: typeof context.onDragStart = (e) => {
    const d = e.active.data.current as { kind?: string; entryId?: string } | undefined
    heldTop.current = d?.kind === 'entry' && d.entryId ? { id: d.entryId, top: where(d.entryId) ?? 0 } : null
    context.onDragStart(e)
  }
  useLayoutEffect(() => {
    const held = heldTop.current
    if (!folding || held?.id !== folding) return
    const now = where(folding)
    if (now !== undefined) window.scrollBy(0, now - held.top)
  }, [folding])

  const remove = (entry: SetEntry, at: number) => {
    onChange(setEntries(beat, beat.entries.filter((e) => e.id !== entry.id)))
    toast(entry.kind === 'crowd' ? 'Crowd work taken out' : entry.kind === 'premise' ? 'Premise taken out' : 'Jokes taken out', {
      label: 'Undo',
      onClick: () => { const now = latest.current.entries; onChange(setEntries(latest.current, [...now.slice(0, at), entry, ...now.slice(at)])) },
    })
  }
  const entries = shown.entries
  if (!entries.length) return <p className="rounded-lg border border-dashed border-rule-strong p-5 text-center text-dim">Empty beat. Add a premise, jokes or crowd work below.</p>
  const firstPremise = entries.findIndex((e) => e.kind === 'premise')
  const held = active?.kind === 'joke' ? shown.entries.flatMap((e) => (hasPieces(e) ? e.pieces : [])).find((p) => p.id === active.pieceId) : undefined
  const heldEntry = active?.kind === 'entry' ? entries.find((e) => e.id === active.entryId) : undefined
  return (
    <DndContext {...context} onDragStart={start}>
      <SortableContext items={entries.map((e) => entryKey(e.id))} strategy={verticalListSortingStrategy}>
        <ol className="space-y-3">
          {entries.map((entry, i) => (
            <EntryBlock key={entry.id} {...rest} entry={entry} index={i} beat={beat} onChange={onChange} canGatePremise={entry.kind === 'premise' && i > firstPremise}
              folded={active?.kind === 'entry'} onStep={(d) => onChange(setEntries(beat, moveEntry(beat.entries, entry.id, i + d)))} onRemove={() => remove(entry, i)}
              selecting={selecting?.entryId === entry.id ? selecting.ids : null} onSelect={(on) => setSelecting(on ? { entryId: entry.id, ids: [] } : null)}
              onPick={(id) => selecting && setSelecting({ ...selecting, ids: selecting.ids.includes(id) ? selecting.ids.filter((x) => x !== id) : [...selecting.ids, id] })}
              onGroup={(ids) => { onGroup(entry.id, ids); setSelecting(null) }} moveItems={moveItems} />
          ))}
        </ol>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {held ? <DragPreview piece={held} pieces={shown.entries.flatMap((e) => (hasPieces(e) ? e.pieces : []))} jokes={rest.jokes} /> : heldEntry ? <DragPreview entry={heldEntry} premises={rest.premises} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
