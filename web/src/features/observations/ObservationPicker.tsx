/**
 * "From observations": the observations something came from, and a search box to link more (the
 * three best matches, same topic first). Used on a joke's or premise's page, where each change
 * saves at once (ObservationsOn), and in the New joke and New premise sheets, where the picks are
 * linked when you save (rows aren't links there, so a tap can't leave the sheet).
 */
import { useTopics } from '../../api/library'
import { useObservationKinds, useObservations } from '../../api/notebook'
import type { Observation } from '../../api/types'
import { LinkedRows } from './LinkedRows'
import { LinkSearch } from './LinkSearch'
import { kindLabel, PLAIN, topicLabel } from './observationMeta'

interface Props {
  linkedIds: string[]
  /** Observations on this topic are suggested first. */
  topicId: string
  onLink: (id: string) => void
  onUnlink: (id: string) => void
  /** Rows open the observation's page (not inside a sheet). */
  openable?: boolean
}

export function ObservationPicker({ linkedIds, topicId, onLink, onUnlink, openable = false }: Props) {
  const { data: observations = [] } = useObservations()
  const { data: topics = [] } = useTopics()
  const { data: kinds = [] } = useObservationKinds()
  const about = (o: Observation) => [topicLabel(topics, o.topic_id), o.kind_id ? kindLabel(kinds, o.kind_id) : null].filter((x) => x && x !== PLAIN).join(' · ')
  const newestFirst = [...observations].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const linked = newestFirst.filter((o) => linkedIds.includes(o.id))
  const candidates = [...newestFirst.filter((o) => o.topic_id === topicId), ...newestFirst.filter((o) => o.topic_id !== topicId)].filter((o) => !linkedIds.includes(o.id))

  return (
    <div className="space-y-2">
      {linked.length > 0 && (
        <LinkedRows rows={linked.map((o) => ({ id: o.id, to: openable ? `/observations/${o.id}` : undefined, text: o.text, sub: about(o) || undefined }))}
          empty="" unlinkLabel="Unlink this observation" onUnlink={onUnlink} />
      )}
      <LinkSearch placeholder={linked.length ? 'Link another observation' : 'Search observations to link'} onPick={onLink}
        items={candidates.map((o) => ({ id: o.id, text: o.text, sub: about(o) || undefined }))} />
    </div>
  )
}
