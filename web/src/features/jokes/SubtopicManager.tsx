/**
 * One topic's subtopics in a sheet of their own, opened from "Manage subtopics…" in the Jokes
 * Subtopic menu or a joke's Subtopic picker: rename, delete, drag into order, add. Like sections
 * inside a Todoist project, you manage them where you use them, not in the whole Topics list.
 */
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useJokes, useTopics } from '../../api/library'
import { Button, IconButton } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { SortableList } from '../../components/ui/SortableList'
import { topicName } from '../../lib/jokeMeta'
import { count as plural } from '../../lib/topics'
import { useSubtopicActions } from './useSubtopicActions'

interface Props {
  /** The topic whose subtopics to manage; null keeps the sheet shut. */
  topicId: string | null
  onClose: () => void
  /** Lets a screen holding an unsaved copy of a joke, or a filter, let go of a subtopic that's gone. */
  onRemoved?: (id: string) => void
}

export function SubtopicManager({ topicId, onClose, onRemoved }: Props) {
  const { data: topics = [] } = useTopics()
  const { data: jokes = [] } = useJokes()
  const s = useSubtopicActions(onRemoved)
  const topic = topics.find((t) => t.id === topicId)
  const jokesIn = (id: string) => jokes.filter((j) => j.subtopic_id === id).length
  const name = topic ? topicName(topic) : ''

  return (
    <Modal open={Boolean(topic)} onOpenChange={(o) => !o && onClose()} title={name || 'Subtopics'}
      description={`Drag the grips to change the order. Deleting a subtopic keeps its jokes in ${name}.`}
      footer={topic && <Button variant="tape" icon={<Plus size={18} />} onClick={() => void s.add(topic)}>Add subtopic</Button>}>
      {topic && (topic.subtopics.length === 0 ? (
        <p className="py-6 text-center text-sm text-faint">No subtopics in {name} yet.</p>
      ) : (
        <SortableList items={topic.subtopics} label={(x) => x.name} onReorder={(ids) => s.reorder(topic, ids)} className="divide-y divide-rule" rowClassName="py-1">
          {(sub) => (
            <div className="flex items-center gap-1">
              <span className="min-w-0 flex-1 truncate">{sub.name}</span>
              <span className="mr-2 text-sm text-faint tabular" title={plural(jokesIn(sub.id), 'joke', 'jokes')}>{jokesIn(sub.id)}</span>
              <IconButton label={`Rename ${sub.name}`} onClick={() => void s.rename(sub)}><Pencil size={16} /></IconButton>
              <IconButton label={`Delete ${sub.name}`} onClick={() => void s.remove(sub, topic)} className="hover:text-light"><Trash2 size={16} /></IconButton>
            </div>
          )}
        </SortableList>
      ))}
    </Modal>
  )
}
