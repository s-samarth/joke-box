/**
 * On a joke's or premise's page, near the top: the observations it came from. Linking and
 * unlinking save at once (offline too), and an unlink can be undone; see ObservationPicker.
 */
import { useLinkObservation, useObservations } from '../../api/notebook'
import { useFeedback } from '../../components/ui/feedbackContext'
import { ObservationPicker } from './ObservationPicker'

export function ObservationsOn({ kind, id, topicId }: { kind: 'premises' | 'jokes'; id: string; topicId: string }) {
  const { data: observations = [] } = useObservations()
  const link = useLinkObservation()
  const { toast } = useFeedback()
  const column = kind === 'premises' ? 'premise_ids' : 'joke_ids'
  const linkedIds = observations.filter((o) => (o[column] ?? []).includes(id)).map((o) => o.id)
  const set = (obsId: string, on: boolean) => link.mutate({ id: obsId, kind, targetId: id, on })
  const unlink = (obsId: string) => {
    set(obsId, false)
    toast('Observation unlinked', { label: 'Undo', onClick: () => set(obsId, true) })
  }

  return (
    <section aria-labelledby={`obs-on-${id}`}>
      <h2 id={`obs-on-${id}`} className="mb-2 text-sm text-dim">From observations</h2>
      <ObservationPicker linkedIds={linkedIds} topicId={topicId} openable onLink={(o) => set(o, true)} onUnlink={unlink} />
    </section>
  )
}
