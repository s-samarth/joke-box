/** Add, rename and delete topics and subtopics. Deleting a topic moves its jokes to Thoughts. */
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useBits, useTopicActions, useTopics } from '../../api/library'
import type { Subtopic, Topic } from '../../api/types'
import { Button, IconButton } from '../../components/ui/Button'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'
import { topicName } from '../../lib/bitMeta'

interface Props {
  open: boolean
  onClose: () => void
  /** Lets a screen holding an unsaved copy of a joke move it off a topic or subtopic that's gone. */
  onRemoved?: (id: string) => void
}

export function TopicManager({ open, onClose, onRemoved }: Props) {
  const { data: topics = [] } = useTopics()
  const { data: bits = [] } = useBits()
  const a = useTopicActions()
  const { prompt, confirm, toast } = useFeedback()
  const fail = (e: Error) => toast(e.message)
  const count = (id: string) => bits.filter((b) => b.topic_id === id || b.subtopic_id === id).length

  const addTopic = async () => {
    const name = await prompt({ title: 'New topic', label: 'Topic name', confirmLabel: 'Add topic' })
    if (name) a.create.mutate(name, { onError: fail })
  }
  const renameTopic = async (t: Topic) => {
    const name = await prompt({ title: 'Rename topic', initial: t.name, confirmLabel: 'Rename' })
    if (name && name !== t.name) a.rename.mutate({ id: t.id, name }, { onError: fail })
  }
  const deleteTopic = async (t: Topic) => {
    if (await confirm({ title: `Delete ${t.name}?`, message: `Its ${count(t.id)} jokes move to Thoughts.`, confirmLabel: 'Delete topic', danger: true })) a.remove.mutate(t.id, { onSuccess: () => onRemoved?.(t.id), onError: fail })
  }
  const addSub = async (t: Topic) => {
    const name = await prompt({ title: `New subtopic in ${topicName(t)}`, label: 'Subtopic name', confirmLabel: 'Add subtopic' })
    if (name) a.addSubtopic.mutate({ topicId: t.id, name }, { onError: fail })
  }
  const renameSub = async (s: Subtopic) => {
    const name = await prompt({ title: 'Rename subtopic', initial: s.name, confirmLabel: 'Rename' })
    if (name && name !== s.name) a.renameSubtopic.mutate({ id: s.id, name }, { onError: fail })
  }
  const deleteSub = async (s: Subtopic) => {
    if (await confirm({ title: `Delete ${s.name}?`, message: 'Its jokes stay in the topic.', confirmLabel: 'Delete subtopic', danger: true })) a.removeSubtopic.mutate(s.id, { onSuccess: () => onRemoved?.(s.id), onError: fail })
  }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Topics" description="Thoughts is where new jokes land. It can't be renamed or deleted."
      footer={<Button variant="tape" icon={<Plus size={18} />} onClick={addTopic}>Add topic</Button>}>
      <ul className="divide-y divide-rule">
        {topics.map((t) => (
          <li key={t.id} className="py-2">
            <div className="flex items-center gap-1">
              <span className="flex-1 font-medium">{topicName(t)}</span>
              <span className="mr-2 text-sm text-faint tabular">{count(t.id)}</span>
              <IconButton label={`Add subtopic to ${topicName(t)}`} onClick={() => addSub(t)}><Plus size={17} /></IconButton>
              {!t.is_system && <IconButton label={`Rename ${t.name}`} onClick={() => renameTopic(t)}><Pencil size={16} /></IconButton>}
              {!t.is_system && <IconButton label={`Delete ${t.name}`} onClick={() => deleteTopic(t)} className="hover:text-light"><Trash2 size={16} /></IconButton>}
            </div>
            {t.subtopics.map((s) => (
              <div key={s.id} className="flex items-center gap-1 pl-5 text-dim">
                <span className="flex-1">{s.name}</span>
                <span className="mr-2 text-sm text-faint tabular">{count(s.id)}</span>
                <IconButton label={`Rename ${s.name}`} onClick={() => renameSub(s)}><Pencil size={15} /></IconButton>
                <IconButton label={`Delete ${s.name}`} onClick={() => deleteSub(s)} className="hover:text-light"><Trash2 size={15} /></IconButton>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </Modal>
  )
}
