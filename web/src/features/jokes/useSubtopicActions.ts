/**
 * Adding, renaming, deleting and reordering one topic's subtopics, with the questions they ask
 * first. Shared by the Topics manager and the Subtopics sheet. Jokes hold a subtopic by its id, so
 * a rename changes nothing on them; deleting one leaves its jokes in the topic, on no subtopic.
 */
import { useTopicActions } from '../../api/library'
import { useReorderSubtopics } from '../../api/ordering'
import type { Subtopic, Topic } from '../../api/types'
import { useFeedback } from '../../components/ui/feedbackContext'
import { topicName } from '../../lib/jokeMeta'

/** `onRemoved` lets a screen holding an unsaved copy of a joke move it off a subtopic that's gone. */
export function useSubtopicActions(onRemoved?: (id: string) => void) {
  const a = useTopicActions()
  const reorderSubs = useReorderSubtopics()
  const { prompt, confirm, toast } = useFeedback()
  const fail = (e: Error) => toast(e.message)

  /** Resolves to the new subtopic, or null if you cancelled or it failed. */
  const add = async (t: Topic): Promise<Subtopic | null> => {
    const name = await prompt({ title: `New subtopic in ${topicName(t)}`, label: 'Subtopic name', confirmLabel: 'Add subtopic' })
    if (!name) return null
    return new Promise((resolve) => a.addSubtopic.mutate({ topicId: t.id, name }, { onSuccess: resolve, onError: (e) => { fail(e); resolve(null) } }))
  }
  const rename = async (s: Subtopic) => {
    const name = await prompt({ title: 'Rename subtopic', initial: s.name, confirmLabel: 'Rename' })
    if (name && name !== s.name) a.renameSubtopic.mutate({ id: s.id, name }, { onError: fail })
  }
  const remove = async (s: Subtopic, topic: Topic) => {
    const ok = await confirm({ title: `Delete ${s.name}?`, message: `Its jokes stay in ${topicName(topic)}, just not in a subtopic.`, confirmLabel: 'Delete subtopic', danger: true })
    if (ok) a.removeSubtopic.mutate(s.id, { onSuccess: () => onRemoved?.(s.id), onError: fail })
  }
  const reorder = (t: Topic, ids: string[]) => reorderSubs.mutate({ topicId: t.id, ids }, { onError: fail })

  return { add, rename, remove, reorder }
}
