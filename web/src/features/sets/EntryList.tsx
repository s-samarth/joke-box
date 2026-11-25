/**
 * A beat's list, in order: premises with their jokes, jokes with no premise (they can sit
 * between premises), and crowd work. Blocks and jokes move by drag or by the arrows
 * (docs/sets.md, "Drag and arrows"). A joke dragged into a premise rests on it in your library,
 * as when it's added there; a drop that moves one off another premise asks first.
 * Jokes first, premise later: Select in a no-premise list ticks jokes to put under a premise.
 * Move on a joke does what a drag does, by name, in two parts: No premise (a new block of its own
 * just below, or another No premise block) and Under a premise (another premise block in the beat,
 * or any premise, picked in SetPickers).
 */
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Beat, Joke, SetEntry } from '../../api/types'
import { useFeedback } from '../../components/ui/feedbackContext'
import type { MenuRow } from '../../components/ui/Menu'
import { setEntries } from './beatEdit'
import { moveEntry, movedLists, spotOf } from './beatMove'
import { hasPieces } from './beats'
import { DragPreview } from './DragPreview'
import { EntryBlock, type BlockProps } from './EntryBlock'
import { dropEmptied, moveChoices, moveTo, type MoveChoice, type MoveTo } from './moveTo'
import { many, short, usePremiseLink } from './usePremiseLink'
import { entryKey, useBeatDrag } from './useBeatDrag'

interface Props extends BlockProps {
  onGroup: (entryId: string, pieceIds: string[]) => void
  onMoveToPremise: (pieceId: string) => void
}

export function EntryList({ beat, onChange, onGroup, onMoveToPremise, ...rest }: Props) {
  const { toast } = useFeedback()
  const { attach, askToMove, takeOf } = usePremiseLink()
  const [selecting, setSelecting] = useState<{ entryId: string; ids: string[] } | null>(null)
  const latest = useRef(beat) // Undo puts it back into the beat as it is by then
  useEffect(() => { latest.current = beat })

  /** Jokes that a drop takes into a premise they don't rest on yet, by premise. */
  const newlyUnder = (next: Beat) => {
    const out = new Map<string, Joke[]>()
    for (const [pieceId, entryId] of movedLists(beat, next)) {
      const e = next.entries.find((x) => x.id === entryId)
      const joke = e?.kind === 'premise' && e.premise_id ? rest.jokes.get(e.pieces.find((p) => p.id === pieceId)?.joke_id ?? '') : undefined
      if (joke && e?.kind === 'premise' && e.premise_id && joke.premise_id !== e.premise_id) out.set(e.premise_id, [...(out.get(e.premise_id) ?? []), joke])
    }
    return out
  }
  const drop = async (next: Beat) => {
    const before = beat
    const moving = newlyUnder(next)
    for (const [premise, list] of moving) if (!(await askToMove(list, premise))) return
    onChange(setEntries(next, dropEmptied(before, next).entries))
    if (!moving.size) return
    const undo = [...moving].map(([premise, list]) => attach(list, premise))
    const count = [...moving.values()].reduce((n, l) => n + l.length, 0)
    const [first] = moving.keys()
    toast(`${many(count)} now on “${short(takeOf(first) ?? 'the premise', 40)}”`, { label: 'Undo', onClick: () => { undo.forEach((u) => u()); onChange(before) } })
  }
  // Move: into a premise it doesn't rest on goes the way a drop does; the rest only moves it in the set.
  const move = (pieceId: string, to: MoveTo, label: string) => {
    const next = moveTo(beat, pieceId, to)
    if (next === beat) return
    if (newlyUnder(next).size) return void drop(next)
    const before = beat
    const from = beat.entries.find((e) => e.id === spotOf(beat, pieceId)?.entryId)
    onChange(setEntries(next, next.entries))
    const left = from?.kind === 'premise' && !next.entries.some((e) => e.kind === 'premise' && e.premise_id === from.premise_id && e.pieces.some((p) => p.id === pieceId))
    toast(left ? `Out of “${short(takeOf(from.premise_id) ?? 'the premise', 40)}” in this set. In your library it still rests on that premise.` : label.startsWith('Into') ? `Moved ${label.replace(/^Into/, 'into')}` : 'Moved into a new block, no premise', { label: 'Undo', onClick: () => onChange(before) })
  }
  // Move: two plain parts, so a joke can always go out on its own with no premise, or under any premise.
  const moveItems = (pieceId: string): MenuRow[] => {
    const { none, premise } = moveChoices(beat, pieceId, takeOf)
    const item = (c: MoveChoice) => ({ label: c.label, onSelect: () => move(pieceId, c.to, c.label) })
    return [
      ...(none.length ? [{ heading: 'No premise' }, ...none.map(item), 'divider' as const] : []),
      { heading: 'Under a premise' }, ...premise.map(item),
      { label: premise.length ? 'Another premise…' : 'Pick a premise…', onSelect: () => onMoveToPremise(pieceId) },
    ]
  }
  const { shown, active, context } = useBeatDrag(beat, (next) => void drop(next))
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
