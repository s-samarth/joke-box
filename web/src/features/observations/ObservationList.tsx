/**
 * Observations by month, newest or oldest first, with a time scrubber to jump back months or
 * years. Each one can be edited, deleted, or turned into a joke: that opens the New joke sheet
 * with the observation as the setup, and the observation stays.
 */
import { Lightbulb, MoreHorizontal, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useTopics } from '../../api/library'
import { useDeleteObservation, useLinkObservation, useObservationKinds } from '../../api/notebook'
import type { Observation } from '../../api/types'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Dropdown } from '../../components/ui/Menu'
import { MonthSection } from '../../components/time/MonthSection'
import { PAGE_RAIL, RAIL_ROOM } from '../../components/time/place'
import { TimeRail } from '../../components/time/TimeRail'
import { byDate, groupByMonth, type Order } from '../../lib/months'
import { formatDate } from '../../lib/time'
import { useCapture } from '../capture/captureContext'
import { kindLabel, PLAIN, topicLabel } from './observationMeta'
import { NewPremiseDialog } from '../premises/NewPremiseDialog'
import { MadeInto } from './ObservationLinks'
import { ObservationSheet } from './ObservationSheet'

const created = (o: Observation) => o.created_at

/** With an `order`, the list is grouped by month with a time scrubber; without one (Home), it's a plain list. */
export function ObservationList({ observations, order }: { observations: Observation[]; order?: Order }) {
  const groups = useMemo(() => (order ? groupByMonth([...observations].sort(byDate(created, order)), created) : []), [observations, order])
  const { data: kinds = [] } = useObservationKinds()
  const { data: topics = [] } = useTopics()
  const remove = useDeleteObservation()
  const { openCapture } = useCapture()
  const { confirm, toast } = useFeedback()
  const [editing, setEditing] = useState<Observation | null>(null)
  const [premiseFrom, setPremiseFrom] = useState<Observation | null>(null)
  const link = useLinkObservation()
  const navigate = useNavigate()
  const linkTo = (o: Observation, kind: 'premises' | 'jokes', targetId: string) => link.mutate({ id: o.id, kind, targetId, on: true })
  // "Driving · Set ideas · 3 Nov": a plain observation doesn't say it's one.
  const filed = (o: Observation) => [topicLabel(topics, o.topic_id), o.kind_id && kindLabel(kinds, o.kind_id)].filter((x) => x && x !== PLAIN)

  const onDelete = async (o: Observation) => {
    if (!(await confirm({ title: 'Delete this observation?', message: 'It goes to the Trash for 30 days.', confirmLabel: 'Delete', danger: true }))) return
    remove.mutate(o.id, { onError: (e) => toast(`Not deleted: ${e.message}`) })
  }

  const list = (items: Observation[]) => (
    <ul className="divide-y divide-rule border-y border-rule">
      {items.map((o) => (
        <li key={o.id} className="flex items-start gap-3 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="leading-relaxed whitespace-pre-wrap">{o.text}</p>
            <p className="mt-1 text-sm text-faint">
              {filed(o).length > 0 && <span className="text-dim">{filed(o).join(' · ')} · </span>}
              {formatDate(o.created_at)}
            </p>
            <MadeInto observation={o} />
          </div>
          <Dropdown
            items={[
              { label: 'Write a premise', icon: <Lightbulb size={16} />, onSelect: () => setPremiseFrom(o) },
              { label: 'Turn into a joke', icon: <Sparkles size={16} />, onSelect: () => openCapture({ setup: o.text, topicId: o.topic_id ?? undefined, onCreated: (id) => linkTo(o, 'jokes', id) }) },
              { label: 'Edit', icon: <Pencil size={16} />, onSelect: () => setEditing(o) },
              'divider',
              { label: 'Delete', icon: <Trash2 size={16} />, danger: true, onSelect: () => void onDelete(o) },
            ]}
            trigger={
              <button type="button" aria-label="Observation actions" className="-mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-faint hover:bg-ink-3 hover:text-paper">
                <MoreHorizontal size={18} />
              </button>
            }
          />
        </li>
      ))}
    </ul>
  )

  return (
    <>
      {order ? (
        <>
          <div className={RAIL_ROOM}>
            {groups.map((g) => (
              <MonthSection key={g.key} scope="obs" monthKey={g.key} label={g.label} count={g.items.length}>{list(g.items)}</MonthSection>
            ))}
          </div>
          <TimeRail scope="obs" months={groups} className={PAGE_RAIL} />
        </>
      ) : list(observations)}
      {editing && <ObservationSheet observation={editing} onClose={() => setEditing(null)} />}
      {premiseFrom && (
        <NewPremiseDialog open onOpenChange={(o) => !o && setPremiseFrom(null)} topicId={premiseFrom.topic_id} initialNotes={premiseFrom.text}
          onCreated={(id) => { linkTo(premiseFrom, 'premises', id); setPremiseFrom(null); navigate(`/premises/${id}`) }} />
      )}
    </>
  )
}
