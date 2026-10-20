/** Filter pills: All, the types used in this folder, and Undefined. Long-press/right-click to rename or delete a type. */
import { Pencil, Trash2 } from 'lucide-react'
import { useTypeActions, useTypes } from '../../api/library'
import { Pill } from '../../components/ui/bits'
import { useFeedback } from '../../components/ui/feedbackContext'
import { WithContextMenu } from '../../components/ui/Menu'
import { UNDEFINED_TYPE } from '../../lib/bitMeta'
import { ALL } from './useLibraryView'

export function TypePills({ types, active, onPick }: { types: string[]; active: string; onPick: (t: string) => void }) {
  const { data: allTypes = [] } = useTypes()
  const actions = useTypeActions()
  const { prompt, confirm, toast } = useFeedback()
  const fail = (e: Error) => toast(e.message)

  const menu = (name: string) => {
    const found = allTypes.find((t) => t.name.toLowerCase() === name.toLowerCase())
    if (!found) return []
    return [
      { label: 'Rename type', icon: <Pencil size={16} />, onSelect: async () => {
        const next = await prompt({ title: 'Rename type', initial: found.name })
        if (next && next !== found.name) actions.rename.mutate({ id: found.id, name: next }, { onError: fail, onSuccess: () => active === name && onPick(next) })
      } },
      { label: 'Delete type', icon: <Trash2 size={16} />, danger: true, onSelect: async () => {
        const ok = await confirm({ title: `Delete “${found.name}”?`, message: 'Bits keep their other types; bits with none become Undefined.', confirmLabel: 'Delete', danger: true })
        if (ok) actions.remove.mutate(found.id, { onError: fail, onSuccess: () => active === name && onPick(ALL) })
      } },
    ]
  }

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
      <Pill active={active === ALL} onClick={() => onPick(ALL)}>All</Pill>
      {types.map((t) => (
        <WithContextMenu key={t} items={menu(t)}>
          <Pill active={active.toLowerCase() === t.toLowerCase()} onClick={() => onPick(t)}>{t}</Pill>
        </WithContextMenu>
      ))}
      <Pill active={active === UNDEFINED_TYPE} onClick={() => onPick(UNDEFINED_TYPE)}>Undefined</Pill>
    </div>
  )
}
