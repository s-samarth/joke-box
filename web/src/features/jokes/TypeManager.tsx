/** Recolour, rename or delete a type across every joke. Renaming onto an existing type merges them. */
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useJokes, useTypeActions, useTypes } from '../../api/library'
import { useSetTypeColor } from '../../api/typeColors'
import type { Named } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { ColorSwatches } from '../../components/ui/ColorSwatches'
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
  const { data: jokes = [] } = useJokes()
  const a = useTypeActions()
  const setColor = useSetTypeColor()
  // The type whose colour grid is open, by id. One at a time keeps the list short.
  const [coloring, setColoring] = useState<string | null>(null)
  const { prompt, confirm, toast } = useFeedback()
  const fail = (e: Error) => toast(e.message)
  const count = (name: string) => jokes.filter((b) => b.types.some((t) => t.toLowerCase() === name.toLowerCase())).length

  const rename = async (t: Named) => {
    const name = await prompt({ title: 'Rename type', initial: t.name, confirmLabel: 'Rename' })
    if (name && name !== t.name) a.rename.mutate({ id: t.id, name }, { onSuccess: () => onRenamed?.(t.name, name), onError: fail })
  }
  const remove = async (t: Named) => {
    const ok = await confirm({ title: `Delete ${t.name}?`, message: 'Jokes keep their other types. Jokes left with none show as having no type.', confirmLabel: 'Delete type', danger: true })
    if (ok) a.remove.mutate(t.id, { onSuccess: () => onRemoved?.(t.name), onError: fail })
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Types" description="Tap a type to change its colour. Types disappear when no joke uses them, but keep their colour if you use them again.">
      {types.length === 0 ? (
        <p className="text-dim">No types yet. Pick one on any joke's page.</p>
      ) : (
        <ul className="divide-y divide-rule">
          {types.map((t) => (
            <li key={t.id} className="py-1.5">
              <div className="flex items-center gap-1">
                <button type="button" aria-expanded={coloring === t.id} onClick={() => setColoring(coloring === t.id ? null : t.id)}
                  className="-ml-2 inline-flex min-h-10 flex-1 items-center gap-2.5 rounded-lg px-2 text-left text-[15px] text-paper hover:bg-ink-3">
                  <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: t.color }} aria-hidden />
                  {t.name}<span className="sr-only">, change colour</span>
                </button>
                <span className="mr-2 text-sm text-faint tabular">{count(t.name)}</span>
                <IconButton label={`Rename ${t.name}`} onClick={() => rename(t)}><Pencil size={16} /></IconButton>
                <IconButton label={`Delete ${t.name}`} onClick={() => remove(t)} className="hover:text-light"><Trash2 size={16} /></IconButton>
              </div>
              {coloring === t.id && (
                <div className="pt-2 pb-3 pl-1">
                  <ColorSwatches label={`Colour for ${t.name}`} value={t.color} onChange={(color) => setColor.mutate({ name: t.name, color }, { onError: fail })} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
