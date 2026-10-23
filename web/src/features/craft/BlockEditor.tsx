/**
 * One block of a note, open for editing where it sits on the page. Cmd/Ctrl+Enter saves,
 * Escape cancels. Saving it empty takes the block out of the note.
 */
import { Plus, Trash2 } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { AddBlockMenu } from './AddBlockMenu'
import type { NewBlock } from './blockEdit'
import { NoteEditor } from './NoteEditor'

interface Props {
  initial: string
  select?: [number, number]
  onSave: (text: string) => void
  onCancel: () => void
  /** For a block already in the note. */
  onDelete?: () => void
  /** Saves this block, then starts a new one under it. */
  onAddBelow: (text: string, kind: NewBlock) => void
}

export function BlockEditor({ initial, select, onSave, onCancel, onDelete, onAddBelow }: Props) {
  const [text, setText] = useState(initial)
  const keys = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSave(text)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }
  return (
    <div className="-mx-2 space-y-2 rounded-xl bg-ink-3/40 p-2 ring-1 ring-tape/50">
      <NoteEditor compact autoFocus value={text} select={select} label="This part of the note" placeholder="Write here" onChange={setText} onKeyDown={keys} />
      <div className="flex flex-wrap items-center gap-2">
        {onDelete && <Button variant="danger" small icon={<Trash2 size={15} />} onClick={onDelete}>Delete</Button>}
        <AddBlockMenu label="Save and add a block below" onPick={(kind) => onAddBelow(text, kind)}
          trigger={<Button variant="quiet" small icon={<Plus size={15} />}>Add below</Button>} />
        <div className="ml-auto flex gap-2">
          <Button variant="quiet" small onClick={onCancel}>Cancel</Button>
          <Button variant="tape" small onClick={() => onSave(text)}>Save</Button>
        </div>
      </div>
    </div>
  )
}
