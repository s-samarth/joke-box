/** Rename or delete a type across every bit. Renaming onto an existing type merges them. */
import { Pencil, Trash2 } from 'lucide-react'
import { useBits, useTypeActions, useTypes } from '../../api/library'
import type { Named } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { TypeLabel } from '../../components/ui/bits'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'

interface Props {
  open: boolean
  onClose: () => void
  /** Lets a screen holding an unsaved copy of a joke (its draft) follow along, so its next
   *  autosave doesn't bring a deleted type back or keep the old name of a renamed one. */
  onRenamed?: (from: string, to: string) => void
  onRemoved?: (name: string) => void
}

export function TypeManager({ open, onClose, onRenamed, onRemoved }: Props) {
  const { data: types = [] } = useTypes()
  const { data: bits = [] } = useBits()
  const a = useTypeActions()
  const { prompt, confirm, toast } = useFeedback()
  const fail = (e: Error) => toast(e.message)
  const count = (name: string) => bits.filter((b) => b.types.some((t) => t.toLowerCase() === name.toLowerCase())).length

  const rename = async (t: Named) => {
    const name = await prompt({ title: 'Rename type', initial: t.name, confirmLabel: 'Rename' })
    if (name && name !== t.name) a.rename.mutate({ id: t.id, name }, { onSuccess: () => onRenamed?.(t.name, name), onError: fail })
  }
  const remove = async (t: Named) => {
    const ok = await confirm({ title: `Delete ${t.name}?`, message: 'Jokes keep their other types. Jokes left with none show as having no type.', confirmLabel: 'Delete type', danger: true })
    if (ok) a.remove.mutate(t.id, { onSuccess: () => onRemoved?.(t.name), onError: fail })
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Types" description="Types are created when you tag a joke, and disappear when no joke uses them.">
      {types.length === 0 ? (
        <p className="text-dim">No types yet. Pick one on any joke's page.</p>
      ) : (
        <ul className="divide-y divide-rule">
          {types.map((t) => (
            <li key={t.id} className="flex items-center gap-1 py-1.5">
              <span className="flex-1"><TypeLabel name={t.name} /></span>
              <span className="mr-2 text-sm text-faint tabular">{count(t.name)}</span>
              <IconButton label={`Rename ${t.name}`} onClick={() => rename(t)}><Pencil size={16} /></IconButton>
              <IconButton label={`Delete ${t.name}`} onClick={() => remove(t)} className="hover:text-light"><Trash2 size={16} /></IconButton>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
