/**
 * A note you can edit where you read it. Tap a paragraph, list or callout and only that block
 * opens for editing; tap a table and the table editor opens. "+" adds a block below one (on
 * hover with a mouse, or "Add below" while editing on a phone), and the button at the end adds
 * one at the bottom. Links and tick boxes keep working as usual.
 *
 * Every save hands the whole new note text to `onChange`; blockEdit.ts does the line surgery.
 */
import { Pencil, Plus } from 'lucide-react'
import { useState, type MouseEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { AddBlockMenu } from './AddBlockMenu'
import { STARTS, insertAfter, linesOf, replaceBlock, type NewBlock, type Place } from './blockEdit'
import { BlockEditor } from './BlockEditor'
import { parseSpans, type Span } from './bodyFormat'
import { BlockView } from './NoteBody'
import { BODY_TEXT, HEADING_GAP } from './noteStyle'
import { TableEditor } from './TableEditor'
import { BLANK_TABLE, readTable, writeTable, type TableData } from './tableText'

interface Props {
  body: string
  onChange: (body: string) => void
  onTick: (line: number) => void
  /** The block changed somewhere else while it was open, so the edit couldn't be placed. */
  onLost: () => void
}

type Editing =
  | { kind: 'block'; place: Place }
  | { kind: 'new'; after: number; text: string; select?: [number, number] }
  | { kind: 'table'; place?: Place; after: number; data: TableData }

/** How many lines a block's text takes once saved (none if it's empty). */
const lineCount = (text: string) => {
  const kept = text.replace(/\s+$/, '')
  return kept ? kept.split('\n').length : 0
}

/** Clicks on these do their own thing rather than opening the block. */
const OWN_CLICK = 'a, button, [role="checkbox"]'

export function EditableBody({ body, onChange, onTick, onLost }: Props) {
  const [editing, setEditing] = useState<Editing | null>(null)
  const spans = parseSpans(body)
  const last = spans.length ? spans[spans.length - 1].to : -1
  const placeOf = (s: Span): Place => ({ from: s.from, to: s.to, text: linesOf(body, s.from, s.to) })

  const open = (s: Span) => {
    const place = placeOf(s)
    setEditing(s.block.type === 'table' ? { kind: 'table', place, after: s.to, data: readTable(place.text) } : { kind: 'block', place })
  }
  const onBlockClick = (e: MouseEvent, s: Span) => {
    // React passes clicks up from menus and sheets too, though they sit elsewhere on the page:
    // only a click on the block itself opens it.
    const target = e.target as Element
    if (!e.currentTarget.contains(target) || target.closest(OWN_CLICK) || window.getSelection()?.toString()) return
    open(s)
  }

  /** Saves `text` over the block (empty takes it out) and returns the note as it is now. */
  const replace = (place: Place, text: string) => {
    const next = replaceBlock(body, place, text)
    if (next === null) {
      onLost()
      return null
    }
    if (next !== body) onChange(next)
    return next
  }
  /** Opens a new block of `kind` under line `after`; a divider goes straight in. */
  const startNew = (current: string, after: number, kind: NewBlock) => {
    if (kind === 'divider') {
      onChange(insertAfter(current, after, '---'))
      setEditing(null)
    } else if (kind === 'table') setEditing({ kind: 'table', after, data: BLANK_TABLE })
    else setEditing({ kind: 'new', after, ...STARTS[kind] })
  }
  const saveNew = (after: number, text: string, start: string) => {
    if (text.trim() && text.trim() !== start.trim()) onChange(insertAfter(body, after, text))
    setEditing(null)
  }
  const saveTable = (data: TableData | null) => {
    if (editing?.kind !== 'table') return
    const text = data ? writeTable(data) : ''
    if (editing.place) replace(editing.place, text)
    else if (text) onChange(insertAfter(body, editing.after, text))
    setEditing(null)
  }

  const newEditor = (after: number) =>
    editing?.kind === 'new' && editing.after === after && (
      <BlockEditor key={`new${after}`} initial={editing.text} select={editing.select} onCancel={() => setEditing(null)}
        onSave={(text) => saveNew(after, text, editing.text)}
        onAddBelow={(text, kind) => {
          const saved = text.trim() && text.trim() !== editing.text.trim()
          if (!saved) return startNew(body, after, kind)
          const next = insertAfter(body, after, text)
          onChange(next)
          startNew(next, after + (after >= 0 ? 1 : 0) + lineCount(text), kind)
        }} />
    )

  return (
    <div className={BODY_TEXT}>
      {newEditor(-1)}
      {spans.map((s) => {
        const gap = s.block.type === 'heading' ? `${HEADING_GAP[s.block.level]} first:mt-0` : ''
        if (editing?.kind === 'block' && editing.place.from === s.from) {
          const { place } = editing
          return (
            <div key={s.from} className={gap}>
              <BlockEditor initial={place.text} onCancel={() => setEditing(null)} onDelete={() => { replace(place, ''); setEditing(null) }}
                onSave={(text) => { replace(place, text); setEditing(null) }}
                onAddBelow={(text, kind) => {
                  const next = replace(place, text)
                  if (next !== null) startNew(next, place.from + lineCount(text) - 1, kind)
                }} />
            </div>
          )
        }
        return (
          <div key={s.from} className={gap}>
            <div className="group relative -mx-2 cursor-text rounded-lg px-2 py-0.5 transition-colors hover:bg-ink-2/70" onClick={(e) => onBlockClick(e, s)}>
              <BlockView block={s.block} onTick={onTick} gap={false} />
              <div className="pointer-events-none absolute top-0 -right-1 flex rounded-lg bg-ink-2 opacity-0 shadow-lift ring-1 ring-rule transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
                <button type="button" aria-label="Edit this part" title="Edit this part" onClick={() => open(s)} className="inline-flex size-8 items-center justify-center rounded-md text-dim hover:bg-ink-3 hover:text-paper"><Pencil size={15} /></button>
                <AddBlockMenu onPick={(kind) => startNew(body, s.to, kind)} />
              </div>
            </div>
            {newEditor(s.to)}
          </div>
        )
      })}
      {editing?.kind !== 'new' || editing.after !== last ? (
        <AddBlockMenu label="Add to the note" onPick={(kind) => startNew(body, last, kind)}
          trigger={<Button variant="quiet" small icon={<Plus size={15} />} className="-ml-2">{spans.length ? 'Add to the note' : 'Write this note'}</Button>} />
      ) : null}
      {editing?.kind === 'table' && (
        <TableEditor data={editing.data} onClose={() => setEditing(null)} onSave={saveTable} onDelete={editing.place ? () => saveTable(null) : undefined} />
      )}
    </div>
  )
}
