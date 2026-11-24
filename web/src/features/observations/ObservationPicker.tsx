/**
 * "From observations": the observations something came from, and a button that opens the
 * observation sheet (the Observations tab's filters, starting on this topic) to link more, as
 * many as you tick. Used on a joke's or premise's page, where each change saves at once
 * (ObservationsOn), and in the New joke and New premise sheets, where the picks are linked when
 * you save (rows aren't links there, so a tap can't leave the sheet).
 */
import { Eye } from 'lucide-react'
import { useState } from 'react'
import { useTopics } from '../../api/library'
import { useObservationKinds, useObservations } from '../../api/notebook'
import type { Observation } from '../../api/types'
import { ObservationPickSheet } from '../pickers/ObservationPickSheet'
import { LinkedRows } from './LinkedRows'
import { kindLabel, PLAIN, topicLabel } from './observationMeta'

const chip = 'inline-flex h-10 items-center gap-2 rounded-lg bg-ink-3 px-3 text-[15px] text-dim hover:bg-ink-4 hover:text-paper'

interface Props {
  linkedIds: string[]
  /** The sheet's filters start on this topic. */
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
  const [picking, setPicking] = useState(false)
  const about = (o: Observation) => [topicLabel(topics, o.topic_id), o.kind_id ? kindLabel(kinds, o.kind_id) : null].filter((x) => x && x !== PLAIN).join(' · ')
  const linked = [...observations].sort((a, b) => b.created_at.localeCompare(a.created_at)).filter((o) => linkedIds.includes(o.id))

  return (
    <div className="space-y-2">
      {linked.length > 0 && (
        <LinkedRows rows={linked.map((o) => ({ id: o.id, to: openable ? `/observations/${o.id}` : undefined, text: o.text, sub: about(o) || undefined }))}
          empty="" unlinkLabel="Unlink this observation" onUnlink={onUnlink} />
      )}
      <button type="button" onClick={() => setPicking(true)} className={chip}><Eye size={16} aria-hidden />{linked.length ? 'Link more observations' : 'Link observations'}</button>
      {picking && (
        <ObservationPickSheet description="Starts on this topic. Clear the filters for any observation." onClose={() => setPicking(false)}
          linkedIds={linkedIds} topicId={topicId} onPick={(ids) => ids.forEach(onLink)} />
      )}
    </div>
  )
}
