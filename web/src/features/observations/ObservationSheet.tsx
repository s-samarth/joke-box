/** Edit one observation: its words, its topic and its kind (or a new topic or kind). */
import { useState } from 'react'
import { useTopics } from '../../api/library'
import { useObservationKinds, useSaveObservation } from '../../api/notebook'
import type { Observation } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Field, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useFeedback } from '../../components/ui/feedbackContext'
import { topicName } from '../../lib/jokeMeta'
import { NEW_TOPIC, useNewTopic } from '../jokes/useNewTopic'
import { PLAIN } from './observationMeta'
import { useNewKind } from './useNewKind'

export function ObservationSheet({ observation, onClose }: { observation: Observation; onClose: () => void }) {
  const [text, setText] = useState(observation.text)
  const [topicId, setTopicId] = useState(observation.topic_id)
  const [kindId, setKindId] = useState(observation.kind_id)
  const { data: topics = [] } = useTopics()
  const { data: kinds = [] } = useObservationKinds()
  const save = useSaveObservation()
  const newTopic = useNewTopic()
  const newKind = useNewKind()
  const { toast } = useFeedback()
  const dirty = text !== observation.text || topicId !== observation.topic_id || kindId !== observation.kind_id

  const pickTopic = async (value: string) => {
    if (value !== NEW_TOPIC) return setTopicId(value || null)
    const topic = await newTopic()
    if (topic) setTopicId(topic.id)
  }
  const pickKind = async (value: string) => {
    if (value !== NEW_TOPIC) return setKindId(value || null)
    const id = await newKind()
    if (id) setKindId(id)
  }
  const submit = () => {
    if (!text.trim()) return
    const input = { text: text.trim(), topic_id: topicId, kind_id: kindId, version: observation.version }
    save.mutate({ id: observation.id, input }, { onError: (e) => toast(`Not saved: ${e.message}`) })
    onClose()
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} dirty={dirty} title="Edit observation"
      footer={<Button variant="tape" onClick={submit} disabled={!text.trim()}>Save</Button>}>
      <div className="space-y-4">
        <Field label="What you noticed">
          <Textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Topic">
            <Select value={topicId ?? ''} onChange={(e) => void pickTopic(e.target.value)}>
              <option value="">No topic yet</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{topicName(t)}</option>)}
              <option value={NEW_TOPIC}>New topic…</option>
            </Select>
          </Field>
          <Field label="Kind">
            <Select value={kindId ?? ''} onChange={(e) => void pickKind(e.target.value)}>
              <option value="">{PLAIN}</option>
              {kinds.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              <option value={NEW_TOPIC}>New kind…</option>
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  )
}
