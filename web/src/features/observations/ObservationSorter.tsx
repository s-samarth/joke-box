/**
 * Sort observations into topics one at a time, like going through an inbox (Things' Inbox,
 * Linear's triage). Set its kind if it isn't a plain observation, then tap its topic: that saves
 * it and shows the next. Skip leaves one for later; Back returns to the one before.
 *
 * The list is fixed when the sheet opens, so sorting one doesn't shift the rest under your thumb.
 */
import { ArrowLeft, Check, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTopics } from '../../api/library'
import { useObservationKinds, useObservations, useSaveObservation } from '../../api/notebook'
import type { Observation } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { useFeedback } from '../../components/ui/feedbackContext'
import { topicName } from '../../lib/jokeMeta'
import { useNewTopic } from '../jokes/useNewTopic'
import { PLAIN } from './observationMeta'

const chip = (on: boolean) =>
  `hit h-9 rounded-lg px-3 text-sm transition ${on ? 'bg-paper font-medium text-ink' : 'bg-ink-3 text-dim hover:text-paper'}`

export function ObservationSorter({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const { data: observations = [] } = useObservations()
  const { data: topics = [] } = useTopics()
  const { data: kinds = [] } = useObservationKinds()
  const save = useSaveObservation()
  const newTopic = useNewTopic()
  const { toast } = useFeedback()
  const [at, setAt] = useState(0)
  const [sorted, setSorted] = useState(0)
  const current: Observation | undefined = observations.find((o) => o.id === ids[at])
  const [kindId, setKindId] = useState<string | null>(current?.kind_id ?? null)

  const go = (to: number) => {
    setAt(to)
    setKindId(observations.find((o) => o.id === ids[to])?.kind_id ?? null)
  }
  const file = (topicId: string) => {
    if (!current) return
    const input = { text: current.text, topic_id: topicId, kind_id: kindId, version: current.version }
    save.mutate({ id: current.id, input }, { onError: (e) => toast(`Not saved: ${e.message}`) })
    setSorted((n) => n + 1)
    go(at + 1)
  }
  const fileNew = async () => {
    const topic = await newTopic()
    if (topic) file(topic.id)
  }
  const done = at >= ids.length || !current
  const skipped = ids.length - sorted

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Sort into topics"
      description={done ? undefined : 'Tap its topic and the next one shows. Set the kind first if it isn’t a plain observation.'}
      footer={done ? <Button variant="tape" onClick={onClose}>Done</Button> : (
        <div className="flex w-full items-center justify-between gap-2">
          <Button variant="quiet" icon={<ArrowLeft size={16} />} onClick={() => go(at - 1)} disabled={at === 0}>Back</Button>
          <Button variant="quiet" onClick={() => go(at + 1)}>Skip</Button>
        </div>
      )}>
      {done ? (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-ink-3 text-tape"><Check size={22} /></span>
          <p className="mt-3 text-lg font-medium">{sorted ? `Sorted ${sorted}` : 'Nothing sorted'}</p>
          <p className="mt-1 text-dim">{skipped === 0 ? 'Every one has a topic now.' : `${skipped} skipped. ${skipped === 1 ? 'It’s' : 'They’re'} under Not sorted for next time.`}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="mb-1.5 text-sm text-faint tabular">{at + 1} of {ids.length}</p>
            <p className="max-h-48 overflow-y-auto rounded-xl bg-ink-2 px-4 py-3 text-[17px] leading-relaxed whitespace-pre-wrap ring-1 ring-rule">{current.text}</p>
          </div>
          <div role="group" aria-label="Kind">
            <p className="mb-2 text-sm text-dim">Kind</p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" aria-pressed={kindId === null} onClick={() => setKindId(null)} className={chip(kindId === null)}>{PLAIN}</button>
              {kinds.map((k) => <button key={k.id} type="button" aria-pressed={kindId === k.id} onClick={() => setKindId(k.id)} className={chip(kindId === k.id)}>{k.name}</button>)}
            </div>
          </div>
          <div role="group" aria-label="Topic">
            <p className="mb-2 text-sm text-dim">Topic</p>
            <div className="flex flex-wrap gap-1.5">
              {topics.map((t) => <button key={t.id} type="button" onClick={() => file(t.id)} className={chip(false)}>{topicName(t)}</button>)}
              <button type="button" onClick={() => void fileNew()} className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm text-tape hover:bg-ink-3"><Plus size={15} />New topic</button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
