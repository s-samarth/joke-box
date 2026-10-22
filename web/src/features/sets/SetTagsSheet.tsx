/** Add, rename and delete set tags. Deleting one takes it off every set; the sets stay. */
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useSetTagActions, useSetTags } from '../../api/setTags'
import { useSetlists } from '../../api/shows'
import type { Named } from '../../api/types'
import { Button, IconButton } from '../../components/ui/Button'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'

export function SetTagsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: tags = [] } = useSetTags()
  const { data: sets = [] } = useSetlists()
  const a = useSetTagActions()
  const { prompt, confirm, toast } = useFeedback()
  const fail = (e: Error) => toast(e.message)
  const count = (id: string) => sets.filter((s) => s.tag_ids?.includes(id)).length

  const add = async () => {
    const name = await prompt({ title: 'New tag', label: 'Tag name', confirmLabel: 'Add tag' })
    if (name) a.create.mutate(name, { onError: fail })
  }
  const rename = async (t: Named) => {
    const name = await prompt({ title: 'Rename tag', initial: t.name, confirmLabel: 'Rename' })
    if (name && name !== t.name) a.rename.mutate({ id: t.id, name }, { onError: fail })
  }
  const remove = async (t: Named) => {
    const n = count(t.id)
    const message = n ? `It comes off ${n} ${n === 1 ? 'set' : 'sets'}. The sets stay.` : 'No sets use it.'
    if (await confirm({ title: `Delete ${t.name}?`, message, confirmLabel: 'Delete tag', danger: true })) a.remove.mutate(t.id, { onError: fail })
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Set tags" description="Labels for your sets, like In progress or Opener set. Adding and changing them needs a connection."
      footer={<Button variant="tape" icon={<Plus size={18} />} onClick={add}>Add tag</Button>}>
      {tags.length === 0 && <p className="py-4 text-dim">No tags yet.</p>}
      <ul className="divide-y divide-rule">
        {tags.map((t) => (
          <li key={t.id} className="flex items-center gap-1 py-2">
            <span className="flex-1 font-medium">{t.name}</span>
            <span className="mr-2 text-sm text-faint tabular">{count(t.id)}</span>
            <IconButton label={`Rename ${t.name}`} onClick={() => rename(t)}><Pencil size={16} /></IconButton>
            <IconButton label={`Delete ${t.name}`} onClick={() => remove(t)} className="hover:text-light"><Trash2 size={16} /></IconButton>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
