/** Arrange, rename and delete observation topics. Deleting one keeps its observations, with no topic. */
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useObservations, useObservationTopicActions, useObservationTopics } from '../../api/notebook'
import { useReorderObservationTopics } from '../../api/ordering'
import type { Named } from '../../api/types'
import { Button, IconButton } from '../../components/ui/Button'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'
import { SortableList } from '../../components/ui/SortableList'
import { useNewObservationTopic } from './useNewObservationTopic'

export function ObservationTopicManager({ onClose }: { onClose: () => void }) {
  const { data: topics = [] } = useObservationTopics()
  const { data: observations = [] } = useObservations()
  const a = useObservationTopicActions()
  const reorder = useReorderObservationTopics()
  const newTopic = useNewObservationTopic()
  const { prompt, confirm, toast } = useFeedback()
  const fail = (e: Error) => toast(e.message)
  const count = (id: string) => observations.filter((o) => o.topic_id === id).length

  const rename = async (t: Named) => {
    const name = await prompt({ title: 'Rename topic', initial: t.name, confirmLabel: 'Rename' })
    if (name && name !== t.name) a.rename.mutate({ id: t.id, name }, { onError: fail })
  }
  const remove = async (t: Named) => {
    const ok = await confirm({ title: `Delete ${t.name}?`, message: `Its ${count(t.id)} observations stay, with no topic.`, confirmLabel: 'Delete topic', danger: true })
    if (ok) a.remove.mutate(t.id, { onError: fail })
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Observation topics" description="These are separate from your joke topics. Drag the grips to change their order."
      footer={<Button variant="tape" icon={<Plus size={18} />} onClick={() => void newTopic()}>Add topic</Button>}>
      {topics.length === 0 ? (
        <p className="text-dim">No observation topics yet.</p>
      ) : (
        <SortableList items={topics} label={(t) => t.name} onReorder={(ids) => reorder.mutate(ids, { onError: fail })} className="divide-y divide-rule" rowClassName="py-1">
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
