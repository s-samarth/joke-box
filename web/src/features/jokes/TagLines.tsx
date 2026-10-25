/**
 * Comedy tags: extra punchlines after the main punch, added and removed one line at a time, and
 * put in order by dragging the grip beside each one.
 *
 * The lines are plain strings, so two can be the same and none has an id. Dragging needs a
 * stable id per row (so a row keeps its id while it moves, and React keeps its text box), so we
 * keep one in state alongside each line here, moving it with the line on every add, remove and reorder.
 */
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { GrowingText } from '../../components/ui/Field'
import { SortableList } from '../../components/ui/SortableList'

let made = 0
const newId = () => `tag${++made}`

export function TagLines({ lines, onChange }: { lines: string[]; onChange: (l: string[]) => void }) {
  const [ids, setIds] = useState(() => lines.map(newId))
  // Lines replaced from outside (a joke loaded, a draft reset): give them fresh ids. Setting state
  // while rendering is React's way to keep it in step with a prop; it re-renders straight away.
  if (ids.length !== lines.length) setIds(lines.map(newId))
  const rows = lines.map((text, i) => ({ id: ids[i] ?? `tag-new${i}`, text, i }))

  const change = (next: string[], nextIds: string[]) => {
    setIds(nextIds)
    onChange(next)
  }
  const reorder = (order: string[]) => change(order.map((id) => lines[ids.indexOf(id)]), order)
  const remove = (i: number) => change(lines.filter((_, n) => n !== i), ids.filter((_, n) => n !== i))

  return (
    <div className="space-y-2">
      <SortableList items={rows} onReorder={reorder} label={(r) => `tag line ${r.i + 1}`} className="space-y-2">
        {({ text, i }) => (
          <div className="group flex items-start gap-2">
            <GrowingText aria-label={`Tag line ${i + 1}`} placeholder="And another thing…" className="text-lg leading-snug text-dim" value={text}
              onChange={(e) => onChange(lines.map((l, n) => (n === i ? e.target.value : l)))} />
            <button type="button" aria-label="Remove tag line" onClick={() => remove(i)} className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-faint hover:text-paper sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100">
              <X size={15} />
            </button>
          </div>
        )}
      </SortableList>
      <button type="button" onClick={() => change([...lines, ''], [...ids, newId()])} className="inline-flex h-9 items-center gap-1.5 text-[15px] text-faint hover:text-tape">
        <Plus size={16} /> Add a tag line
      </button>
    </div>
  )
}
