/**
 * Craft notes for the screen you're on, in a sheet: the Rewrite checklists, the set-building
 * notes beside a set, the stage notes before you go on. Pick a note from the row at the top.
 * A checklist's items tick on and off here without changing the note, so each run starts fresh.
 */
import { useState } from 'react'
import { Link } from 'react-router'
import { useCraftNotes } from '../../api/craft'
import type { CraftArea, CraftKind } from '../../api/types'
import { Modal } from '../../components/ui/Modal'
import { listItems } from './bodyFormat'
import { notesFor } from './craftMeta'
import { NoteBody } from './NoteBody'
import { TickList } from './TickList'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  areas: CraftArea[]
  /** Only these kinds; all kinds when left out. */
  kinds?: CraftKind[]
  /** Shown when there's nothing to show yet. */
  empty: string
}

const chip = (on: boolean) => `h-8 shrink-0 rounded-lg px-3 text-sm transition ${on ? 'bg-paper font-medium text-ink' : 'bg-ink-3 text-dim hover:text-paper'}`

export function CraftSheet({ open, onOpenChange, title, areas, kinds, empty }: Props) {
  const { data: all = [] } = useCraftNotes()
  const notes = notesFor(all, areas, kinds)
  const [pickedId, setPickedId] = useState<string | null>(null)
  // Ticks per note, kept while the screen is open.
  const [ticks, setTicks] = useState<Record<string, number[]>>({})
  const note = notes.find((n) => n.id === pickedId) ?? notes[0]
  const newHref = `/craft/new?area=${areas[areas.length - 1]}${kinds?.length === 1 ? `&kind=${kinds[0]}` : ''}`

  const tick = (line: number) => note && setTicks((t) => {
    const on = t[note.id] ?? []
    return { ...t, [note.id]: on.includes(line) ? on.filter((l) => l !== line) : [...on, line] }
  })

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} wide>
      {!note ? (
        <p className="text-dim">{empty} <Link to={newHref} className="text-tape">Add one in Craft</Link></p>
      ) : (
        <>
          {notes.length > 1 && (
            <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]" role="group" aria-label="Notes">
              {notes.map((n) => <button key={n.id} type="button" className={chip(n.id === note.id)} aria-pressed={n.id === note.id} onClick={() => setPickedId(n.id)}>{n.title}</button>)}
            </div>
          )}
          {note.kind === 'checklist' ? (
            <TickList items={listItems(note.body)} ticked={ticks[note.id] ?? []} onTick={tick} onReset={() => setTicks((t) => ({ ...t, [note.id]: [] }))} />
          ) : (
            <NoteBody body={note.body} />
          )}
          <p className="mt-5 text-sm"><Link to={`/craft/${note.id}`} className="text-dim hover:text-paper">Open {note.title} in Craft</Link></p>
        </>
      )}
    </Modal>
  )
}
