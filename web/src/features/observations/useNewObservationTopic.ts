/** Ask for a name and create an observation topic; resolves to its id, or null if cancelled. */
import { useObservationTopicActions } from '../../api/notebook'
import { useFeedback } from '../../components/ui/feedbackContext'

export function useNewObservationTopic() {
  const { create } = useObservationTopicActions()
  const { prompt, toast } = useFeedback()
  return async (): Promise<string | null> => {
    const name = await prompt({ title: 'New observation topic', label: 'e.g. Airports, My landlord', confirmLabel: 'Add topic' })
    if (!name) return null
    try {
      return (await create.mutateAsync(name)).id
    } catch (e) {
      toast((e as Error).message)
      return null
    }
  }
}
