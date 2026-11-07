/** Ask for a name and add a kind of observation; resolves to its id, or null if cancelled. */
import { useObservationKindActions } from '../../api/notebook'
import { useFeedback } from '../../components/ui/feedbackContext'

export function useNewKind() {
  const { create } = useObservationKindActions()
  const { prompt, toast } = useFeedback()
  return async (): Promise<string | null> => {
    const name = await prompt({ title: 'New kind', label: 'Set ideas, Questions, Craft', confirmLabel: 'Add kind' })
    if (!name) return null
    try {
      return (await create.mutateAsync(name)).id
    } catch (e) {
      toast((e as Error).message)
      return null
    }
  }
}
