/** Edit one observation: its words and its topic (or a new topic). */
import { useState } from 'react'
import { useObservationTopics, useSaveObservation } from '../../api/notebook'
import type { Observation } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Field, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useFeedback } from '../../components/ui/feedbackContext'
import { useNewObservationTopic } from './useNewObservationTopic'

const NEW = '__new__'

export function ObservationSheet({ observation, onClose }: { observation: Observation; onClose: () => void }) {
  const [text, setText] = useState(observation.text)
  const [topicId, setTopicId] = useState(observation.topic_id)
  const { data: topics = [] } = useObservationTopics()
  const save = useSaveObservation()
  const newTopic = useNewObservationTopic()
  const { toast } = useFeedback()

  const pick = async (value: string) => {
    if (value !== NEW) return setTopicId(value || null)
    const id = await newTopic()
    if (id) setTopicId(id)
  }
  const submit = () => {
    if (!text.trim()) return
    save.mutate({ id: observation.id, input: { text: text.trim(), topic_id: topicId } }, { onError: (e) => toast(`Not saved: ${e.message}`) })
    onClose()
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Edit observation"
      footer={<Button variant="tape" onClick={submit} disabled={!text.trim()}>Save</Button>}>
      <div className="space-y-4">
        <Field label="What you noticed">
          <Textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <Field label="Topic">
          <Select value={topicId ?? ''} onChange={(e) => pick(e.target.value)}>
            <option value="">No topic</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            <option value={NEW}>New topic…</option>
          </Select>
        </Field>
      </div>
    </Modal>
  )
}
