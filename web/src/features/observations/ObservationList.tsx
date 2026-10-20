/**
 * Observations, newest first. Each one can be edited, deleted, or turned into a joke: that
 * opens the New joke sheet with the observation as the premise, and the observation stays.
 */
import { MoreHorizontal, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useDeleteObservation, useObservationTopics } from '../../api/notebook'
import type { Observation } from '../../api/types'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Dropdown } from '../../components/ui/Menu'
import { formatDate } from '../../lib/time'
import { useCapture } from '../capture/captureContext'
import { ObservationSheet } from './ObservationSheet'

export function ObservationList({ observations }: { observations: Observation[] }) {
  const { data: topics = [] } = useObservationTopics()
  const remove = useDeleteObservation()
  const { openCapture } = useCapture()
  const { confirm, toast } = useFeedback()
  const [editing, setEditing] = useState<Observation | null>(null)
  const topicName = (id: string | null) => topics.find((t) => t.id === id)?.name

  const onDelete = async (o: Observation) => {
    if (!(await confirm({ title: 'Delete this observation?', confirmLabel: 'Delete', danger: true }))) return
    remove.mutate(o.id, { onError: (e) => toast(`Not deleted: ${e.message}`) })
  }

  return (
    <>
      <ul className="divide-y divide-rule border-y border-rule">
        {observations.map((o) => (
          <li key={o.id} className="flex items-start gap-3 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="leading-relaxed whitespace-pre-wrap">{o.text}</p>
              <p className="mt-1 text-sm text-faint">
                {topicName(o.topic_id) && <span className="text-dim">{topicName(o.topic_id)}, </span>}
                {formatDate(o.created_at)}
              </p>
            </div>
            <Dropdown
              items={[
                { label: 'Turn into a joke', icon: <Sparkles size={16} />, onSelect: () => openCapture({ setup: o.text }) },
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
      {editing && <ObservationSheet observation={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
