/**
 * On a joke or premise: the observations it came from. Search to link more, as many as you like;
 * × unlinks one. Suggestions start with observations on the same topic.
 */
import { useTopics } from '../../api/library'
import { useLinkObservation, useObservationKinds, useObservations } from '../../api/notebook'
import type { Observation } from '../../api/types'
import { LinkedRows } from './LinkedRows'
import { LinkSearch } from './LinkSearch'
import { kindLabel, PLAIN, topicLabel } from './observationMeta'

type Kind = 'premises' | 'jokes'

export function ObservationsOn({ kind, id, topicId }: { kind: Kind; id: string; topicId: string }) {
  const { data: observations = [] } = useObservations()
  const { data: topics = [] } = useTopics()
  const { data: kinds = [] } = useObservationKinds()
  const link = useLinkObservation()
  const column = kind === 'premises' ? 'premise_ids' : 'joke_ids'
  const linked = (o: Observation) => (o[column] ?? []).includes(id)
  const about = (o: Observation) => [topicLabel(topics, o.topic_id), o.kind_id ? kindLabel(kinds, o.kind_id) : null].filter((x) => x && x !== PLAIN).join(' · ')
  const newestFirst = [...observations].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const candidates = [...newestFirst.filter((o) => o.topic_id === topicId), ...newestFirst.filter((o) => o.topic_id !== topicId)].filter((o) => !linked(o))
  const set = (obsId: string, on: boolean) => link.mutate({ id: obsId, kind, targetId: id, on })

  return (
    <section aria-labelledby={`obs-on-${id}`} className="mt-10">
      <h2 id={`obs-on-${id}`} className="headline text-2xl">Observations</h2>
      <p className="mt-1 mb-3 text-sm text-dim">What you noticed that led here.</p>
      <LinkedRows rows={newestFirst.filter(linked).map((o) => ({ id: o.id, to: `/observations/${o.id}`, text: o.text, sub: about(o) || undefined }))}
        empty="None linked yet." unlinkLabel="Unlink this observation" onUnlink={(obsId) => set(obsId, false)} />
      <div className="mt-3">
        <LinkSearch placeholder="Search observations to link" onPick={(obsId) => set(obsId, true)}
          items={candidates.map((o) => ({ id: o.id, text: o.text, sub: about(o) || undefined }))} />
      </div>
    </section>
  )
}
