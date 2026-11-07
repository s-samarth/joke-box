/**
 * Arrange, rename and delete kinds of observation. Deleting one keeps its observations, as plain
 * observations.
 */
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useObservations, useObservationKindActions, useObservationKinds } from '../../api/notebook'
import { useReorderObservationKinds } from '../../api/ordering'
import type { Named } from '../../api/types'
import { Button, IconButton } from '../../components/ui/Button'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'
import { SortableList } from '../../components/ui/SortableList'
import { useNewKind } from './useNewKind'

export function KindManager({ onClose }: { onClose: () => void }) {
  const { data: kinds = [] } = useObservationKinds()
  const { data: observations = [] } = useObservations()
  const a = useObservationKindActions()
  const reorder = useReorderObservationKinds()
  const newKind = useNewKind()
  const { prompt, confirm, toast } = useFeedback()
  const fail = (e: Error) => toast(e.message)
  const count = (id: string) => observations.filter((o) => o.kind_id === id).length

  const rename = async (t: Named) => {
    const name = await prompt({ title: 'Rename kind', initial: t.name, confirmLabel: 'Rename' })
    if (name && name !== t.name) a.rename.mutate({ id: t.id, name }, { onError: fail })
  }
  const remove = async (t: Named) => {
    const ok = await confirm({ title: `Delete ${t.name}?`, message: `Its ${count(t.id)} observations stay, as plain observations.`, confirmLabel: 'Delete kind', danger: true })
    if (ok) a.remove.mutate(t.id, { onError: fail })
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Kinds" description="What sort of note an observation is, apart from its topic. Plain observations need no kind. Drag the grips to change the order."
      footer={<Button variant="tape" icon={<Plus size={18} />} onClick={() => void newKind()}>Add kind</Button>}>
      {kinds.length === 0 ? (
        <p className="text-dim">No kinds yet. Add one for notes that aren't plain observations, like ideas for sets.</p>
      ) : (
        <SortableList items={kinds} label={(t) => t.name} onReorder={(ids) => reorder.mutate(ids, { onError: fail })} className="divide-y divide-rule" rowClassName="py-1">
          {(t) => (
            <div className="flex items-center gap-1">
              <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
              <span className="mr-2 text-sm text-faint tabular">{count(t.id)}</span>
              <IconButton label={`Rename ${t.name}`} onClick={() => rename(t)}><Pencil size={16} /></IconButton>
              <IconButton label={`Delete ${t.name}`} onClick={() => remove(t)} className="hover:text-light"><Trash2 size={16} /></IconButton>
            </div>
          )}
        </SortableList>
      )}
    </Modal>
  )
}
