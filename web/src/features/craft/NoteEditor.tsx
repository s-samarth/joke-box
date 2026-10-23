/**
 * The text box for a note, with a formatting toolbar, list-friendly keys and a table editor.
 *
 * Keys: Enter continues a list, tick boxes or a callout (Enter on an empty item ends it), Tab and
 * Shift+Tab indent list items, Cmd/Ctrl+B bolds. The full editor also has Write and Preview tabs;
 * `compact` drops them for editing one block in place.
 *
 * Every change goes through applyEdit, which "types" it into the box so Cmd+Z undoes it. New
 * blocks (steps, a table, a divider) go in after the cursor's line, never over selected text.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { GrowingText, Textarea } from '../../components/ui/Field'
import { afterOverlaysClose, applyEdit } from './applyEdit'
import { parseSpans } from './bodyFormat'
import { STEPS, continueLine, indentItems, insertBlock, lineEnd, setLineKind, toggleBold, type Edit } from './editText'
import { FormatToolbar } from './FormatToolbar'
import { NoteBody } from './NoteBody'
import { TableEditor } from './TableEditor'
import { BLANK_TABLE, readTable, writeTable, type TableData } from './tableText'

interface Props {
  value: string
  onChange: (value: string) => void
  /** Names the text box for screen readers. */
  label: string
  placeholder?: string
  compact?: boolean
  autoFocus?: boolean
  /** What to select when it opens focused; the cursor goes at the end otherwise. */
  select?: [number, number]
  /** Runs after the editor's own keys, for Save and Cancel shortcuts. */
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void
}

/** The table being edited: where its text sits in the box (or where a new one goes) and its cells. */
interface OpenTable {
  data: TableData
  from: number
  to: number
  existing: boolean
}

/** Where the table around the cursor sits, if the cursor is in one. */
function tableAt(value: string, cursor: number): Omit<OpenTable, 'data' | 'existing'> | null {
  const line = value.slice(0, cursor).split('\n').length - 1
  const span = parseSpans(value).find((s) => s.block.type === 'table' && s.from <= line && line <= s.to)
  if (!span) return null
  const lines = value.split('\n')
  const from = lines.slice(0, span.from).join('\n').length + (span.from ? 1 : 0)
  return { from, to: from + lines.slice(span.from, span.to + 1).join('\n').length }
}

export function NoteEditor({ value, onChange, label, placeholder, compact, autoFocus, select, onKeyDown }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (!autoFocus) return
    // Opened from a menu: wait for it to close, or it keeps focus for itself.
    afterOverlaysClose(() => {
      const el = ref.current
      if (!el) return
      const [start, end] = select ?? [el.value.length, el.value.length]
      el.focus()
      el.setSelectionRange(start, end)
    })
    // Only when it opens: `select` stays the same object while the block is open.
  }, [autoFocus, select])
  const [preview, setPreview] = useState(false)
  const [table, setTable] = useState<OpenTable | null>(null)

  const run = (change: (v: string, start: number, end: number) => Edit | null) => {
    const el = ref.current
    if (!el) return false
    const edit = change(el.value, el.selectionStart, el.selectionEnd)
    if (edit) applyEdit(el, edit)
    return Boolean(edit)
  }

  const openTable = () => {
    const el = ref.current
    if (!el) return
    const at = tableAt(el.value, el.selectionStart)
    if (at) setTable({ ...at, existing: true, data: readTable(el.value.slice(at.from, at.to)) })
    else setTable({ from: lineEnd(el.value, el.selectionEnd), to: lineEnd(el.value, el.selectionEnd), existing: false, data: BLANK_TABLE })
  }
  const putTable = (text: string) => {
    if (!table) return
    const { from, to, existing } = table
    setTable(null)
    afterOverlaysClose(() => run((v) => {
      if (!existing) return text ? insertBlock(v, from, to, text) : null
      return { value: v.slice(0, from) + text + v.slice(to), start: from + text.length, end: from + text.length }
    }))
  }

  const keys = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.metaKey || e.ctrlKey
    if (e.key === 'Enter' && !e.shiftKey && !mod && !e.nativeEvent.isComposing) {
      if (run(continueLine)) e.preventDefault()
    } else if (e.key === 'Tab' && !mod) {
      if (run((v, s, en) => indentItems(v, s, en, e.shiftKey))) e.preventDefault()
    } else if (mod && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      run(toggleBold)
    }
    if (!e.defaultPrevented) onKeyDown?.(e)
  }

  const box = {
    ref, value, placeholder, 'aria-label': label, onKeyDown: keys,
    onChange: (e: { target: { value: string } }) => onChange(e.target.value),
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        {!preview && (
          <FormatToolbar
            onKind={(kind) => run((v, s, e) => setLineKind(v, s, e, kind))}
            onBold={() => run(toggleBold)}
            onSteps={() => run((v, _, e) => insertBlock(v, lineEnd(v, e), lineEnd(v, e), STEPS, [0, STEPS.length]))}
            onTable={openTable}
            onDivider={() => run((v, _, e) => insertBlock(v, lineEnd(v, e), lineEnd(v, e), '---'))}
          />
        )}
        {!compact && (
          <div role="tablist" aria-label="Write or preview" className="ml-auto flex shrink-0 rounded-lg bg-ink-3 p-0.5 text-sm">
            {(['Write', 'Preview'] as const).map((tab) => (
              <button key={tab} type="button" role="tab" aria-selected={preview === (tab === 'Preview')} onClick={() => setPreview(tab === 'Preview')}
                className={`h-8 rounded-md px-3 ${preview === (tab === 'Preview') ? 'bg-ink-4 text-paper' : 'text-dim hover:text-paper'}`}>{tab}</button>
            ))}
          </div>
        )}
      </div>
      {preview ? (
        <div className="min-h-72 rounded-lg bg-ink-2 px-4 py-3 ring-1 ring-rule-strong">
          {value.trim() ? <NoteBody body={value} /> : <p className="text-faint">Nothing written yet.</p>}
        </div>
      ) : compact ? (
        <div className="rounded-lg bg-ink-2 px-3 py-2.5 ring-1 ring-rule-strong focus-within:ring-2 focus-within:ring-tape">
          <GrowingText {...box} className="min-h-16 text-[16px] leading-relaxed sm:text-[15px]" />
        </div>
      ) : (
        <Textarea {...box} className="h-[55dvh] min-h-72 font-[inherit]" />
      )}
      {table && (
        <TableEditor data={table.data} onClose={() => setTable(null)} onSave={(d) => putTable(writeTable(d))}
          onDelete={table.existing ? () => putTable('') : undefined} />
      )}
    </div>
  )
}
