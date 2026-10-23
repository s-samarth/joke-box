/**
 * Edit a note's table as boxes instead of "|" characters. Each row is a card you can drag into
 * place; on a phone its cells stack, from 640px up they sit side by side under the column names.
 * Saving hands back the cells; tableText.ts turns them into the note's "| a | b |" lines.
 */
import { Plus, Trash2, X } from 'lucide-react'
import { useState, type CSSProperties, type KeyboardEvent } from 'react'
import { newId } from '../../api/client'
import { Button, IconButton } from '../../components/ui/Button'
import { GrowingText } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { SortableList } from '../../components/ui/SortableList'
import type { TableData } from './tableText'

interface Props {
  data: TableData
  onSave: (data: TableData) => void
  onClose: () => void
  /** Offered when editing a table that's already in the note. */
  onDelete?: () => void
}

/** Cells hold one line, so Enter doesn't add a line break. */
const oneLine = (e: KeyboardEvent) => e.key === 'Enter' && e.preventDefault()

function Cell({ value, label, onChange }: { value: string; label: string; onChange: (v: string) => void }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs text-faint sm:sr-only">{label}</span>
      <span className="block rounded-lg bg-ink px-3 py-2 ring-1 ring-rule-strong focus-within:ring-2 focus-within:ring-tape">
        <GrowingText value={value} aria-label={label} className="text-[16px] sm:text-[15px]" onKeyDown={oneLine} onChange={(e) => onChange(e.target.value)} />
      </span>
    </label>
  )
}

export function TableEditor({ data, onSave, onClose, onDelete }: Props) {
  const width = Math.max(1, data.head?.length ?? 0, ...data.rows.map((r) => r.length))
  const fit = (r: string[]) => Array.from({ length: width }, (_, i) => r[i] ?? '')
  const [hasHead, setHasHead] = useState(data.head !== null)
  const [head, setHead] = useState(fit(data.head ?? []))
  const [rows, setRows] = useState(() => data.rows.map((r) => ({ id: newId(), cells: fit(r) })))
  const cols = head.length
  const name = (i: number) => (hasHead && head[i]?.trim()) || `Column ${i + 1}`
  const grid = { '--cols': cols } as CSSProperties
  const gridClass = 'grid gap-2 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]'

  const setCell = (id: string, c: number, v: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, cells: r.cells.map((x, i) => (i === c ? v : x)) } : r)))
  const addRow = () => setRows((rs) => [...rs, { id: newId(), cells: Array(cols).fill('') }])
  const addColumn = () => {
    setHead((h) => [...h, ''])
    setRows((rs) => rs.map((r) => ({ ...r, cells: [...r.cells, ''] })))
  }
  const removeColumn = (c: number) => {
    setHead((h) => h.filter((_, i) => i !== c))
    setRows((rs) => rs.map((r) => ({ ...r, cells: r.cells.filter((_, i) => i !== c) })))
  }
  const reorder = (ids: string[]) => setRows((rs) => ids.map((id) => rs.find((r) => r.id === id)!))
  const save = () => onSave({ head: hasHead ? head : null, rows: rows.map((r) => r.cells) })

  const footer = (
    <>
      {onDelete && <Button variant="danger" small icon={<Trash2 size={15} />} className="mr-auto" onClick={onDelete}>Delete table</Button>}
      <Button variant="quiet" onClick={onClose}>Cancel</Button>
      <Button variant="tape" onClick={save}>Save table</Button>
    </>
  )

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Table" description="Rows you leave empty are dropped. A “|” in a cell becomes “/”." wide footer={footer}>
      <div className="space-y-5">
        <section className="space-y-2">
          <h3 className="text-sm text-dim">Columns</h3>
          <div className={gridClass} style={grid}>
            {head.map((h, c) => (
              <div key={c} className="flex items-end gap-1">
                {hasHead
                  ? <div className="min-w-0 flex-1"><Cell value={h} label={`Name of column ${c + 1}`} onChange={(v) => setHead((hs) => hs.map((x, i) => (i === c ? v : x)))} /></div>
                  : <span className="flex h-10 flex-1 items-center text-sm text-faint">Column {c + 1}</span>}
                <IconButton label={`Remove column ${c + 1}`} disabled={cols === 1} onClick={() => removeColumn(c)}><X size={16} /></IconButton>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button small variant="quiet" icon={<Plus size={15} />} onClick={addColumn}>Add column</Button>
            {/* After the column names, so the sheet opens with the first name ready to type. */}
            <label className="flex items-center gap-2 text-sm text-dim">
              <input type="checkbox" checked={hasHead} onChange={(e) => setHasHead(e.target.checked)} className="size-4 accent-tape" />
              Show column names
            </label>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm text-dim">Rows</h3>
          <SortableList items={rows} onReorder={reorder} label={(r) => r.cells[0] || 'this row'} className="space-y-2" rowClassName="rounded-xl bg-ink-3/50 p-2 ring-1 ring-rule">
            {(r) => (
              <div className="flex items-start gap-1">
                <div className={`${gridClass} min-w-0 flex-1`} style={grid}>
                  {r.cells.map((v, c) => <Cell key={c} value={v} label={name(c)} onChange={(x) => setCell(r.id, c, x)} />)}
                </div>
                <IconButton label="Remove this row" onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}><Trash2 size={16} /></IconButton>
              </div>
            )}
          </SortableList>
          <Button small variant="quiet" icon={<Plus size={15} />} onClick={addRow}>Add row</Button>
        </section>
      </div>
    </Modal>
  )
}
