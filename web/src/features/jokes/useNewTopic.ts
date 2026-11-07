/**
 * Ask for a name and add a topic. Jokes, premises and observations share one topic list, so every
 * topic menu and picker, and the topic manager, add topics through this.
 */
import { useTopicActions } from '../../api/library'
import type { Topic } from '../../api/types'
import { useFeedback } from '../../components/ui/feedbackContext'

/** The value a topic picker's "New topic…" option carries. */
export const NEW_TOPIC = '__new__'

export function useNewTopic(): () => Promise<Topic | null> {
  const { create } = useTopicActions()
  const { prompt, toast } = useFeedback()
  return async () => {
    const name = await prompt({ title: 'New topic', label: 'Topic name', confirmLabel: 'Add topic' })
    if (!name) return null
    try {
      return await create.mutateAsync(name)
    } catch (e) {
      toast((e as Error).message)
      return null
    }
  }
}
