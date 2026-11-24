/**
 * Add, arrange, rename and delete joke statuses. Draft is where new jokes start, so it stays first
 * and can't be renamed or deleted. Deleting a status sends its jokes back to Draft; renaming onto
 * a status you already have merges the two. (Premises keep their own fixed four.)
 */
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useJokes, useStatusActions, useStatuses } from '../../api/library'
import { useReorderStatuses } from '../../api/ordering'
import type { Named } from '../../api/types'
import { Button, IconButton } from '../../components/ui/Button'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'
import { SortableList } from '../../components/ui/SortableList'
import { isDefaultStatus, statusOf } from '../../lib/jokeMeta'
import { count as plural } from '../../lib/topics'

interface Props {
  open: boolean
  onClose: () => void
  /** Lets a screen holding an unsaved copy of a joke follow along, so its next autosave doesn't
   *  bring back a deleted status or the old name of a renamed one. */
  onRenamed?: (from: string, to: string) => void
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export function StatusManager({ open, onClose, onRenamed }: Props) {
  const { data: statuses = [] } = useStatuses()
  const { data: jokes = [] } = useJokes()
  const a = useStatusActions()
  const reorder = useReorderStatuses()
  const { prompt, confirm, toast } = useFeedback()
  const fail = (e: Error) => toast(e.message)
  const count = (name: string) => jokes.filter((j) => same(statusOf(j.status), name)).length

  const add = async () => {
    const name = await prompt({ title: 'New status', label: 'e.g. Ready to record', confirmLabel: 'Add status' })
    if (name) a.create.mutate(name, { onError: fail })
  }
  const rename = async (s: Named) => {
    const name = await prompt({ title: 'Rename status', initial: s.name, confirmLabel: 'Rename' })
    if (!name || name === s.name) return
    const into = statuses.find((t) => t.id !== s.id && same(t.name, name))
    if (into && !(await confirm({ title: `Merge into ${into.name}?`, message: `You already have ${into.name}. ${plural(count(s.name), 'joke', 'jokes')} from ${s.name} join it, and ${s.name} goes.`, confirmLabel: 'Merge' }))) return
    a.rename.mutate({ id: s.id, name }, { onSuccess: () => onRenamed?.(s.name, into?.name ?? name), onError: fail })
  }
  const remove = async (s: Named) => {
    const n = count(s.name)
    const ok = await confirm({ title: `Delete ${s.name}?`, message: n ? `Its ${plural(n, 'joke', 'jokes')} go back to Draft.` : 'No joke has it.', confirmLabel: 'Delete status', danger: true })
    if (ok) a.remove.mutate(s.id, { onSuccess: () => onRenamed?.(s.name, 'Draft'), onError: fail })
  }

  const row = (s: Named, pinned = false) => (
    <div className="flex min-h-11 items-center gap-1">
      <span className={`min-w-0 flex-1 truncate ${pinned ? 'font-medium' : ''}`}>
        {s.name}{pinned && <span className="ml-2 text-xs font-normal text-faint">default</span>}
      </span>
      <span className="mr-2 text-sm text-faint tabular">{count(s.name)}</span>
      {!pinned && <IconButton label={`Rename ${s.name}`} onClick={() => void rename(s)}><Pencil size={16} /></IconButton>}
      {!pinned && <IconButton label={`Delete ${s.name}`} onClick={() => void remove(s)} className="hover:text-light"><Trash2 size={16} /></IconButton>}
    </div>
  )
  const [pinned, movable] = [statuses.filter((s) => isDefaultStatus(s.name)), statuses.filter((s) => !isDefaultStatus(s.name))]

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Statuses"
      description="Every joke has one. New jokes start as Draft, so it stays first and can't be renamed or deleted. Drag the grips to change the order."
      footer={<Button variant="tape" icon={<Plus size={18} />} onClick={() => void add()}>Add status</Button>}>
      <div className="divide-y divide-rule">
        {pinned.map((s) => <div key={s.id} className="py-1 pl-8">{row(s, true)}</div>)}
        <SortableList items={movable} label={(s) => s.name} onReorder={(ids) => reorder.mutate(ids, { onError: fail })} className="divide-y divide-rule" rowClassName="py-1">
          {(s) => row(s)}
        </SortableList>
      </div>
    </Modal>
  )
}
