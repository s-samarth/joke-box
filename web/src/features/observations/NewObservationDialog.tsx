/** Log something you noticed: the words, and a topic and kind if you want them (both optional). */
import { useState } from 'react'
import { newId } from '../../api/client'
import { useTopics } from '../../api/library'
import { useObservationKinds, useSaveObservation } from '../../api/notebook'
import { Button } from '../../components/ui/Button'
import { Field, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useFeedback } from '../../components/ui/feedbackContext'
import { topicName } from '../../lib/jokeMeta'
import { NEW_TOPIC, useNewTopic } from '../jokes/useNewTopic'
import { PLAIN } from './observationMeta'
import { useNewKind } from './useNewKind'

interface Props {
  onClose: () => void
  /** What it starts filed under: the list's filters. */
  topicId?: string | null
  kindId?: string | null
  onCreated: (id: string) => void
}

export function NewObservationDialog({ onClose, topicId = null, kindId = null, onCreated }: Props) {
  const { data: topics = [] } = useTopics()
  const { data: kinds = [] } = useObservationKinds()
  const save = useSaveObservation()
  const newTopic = useNewTopic()
  const newKind = useNewKind()
  const { toast } = useFeedback()
  const [text, setText] = useState('')
  const [topic, setTopic] = useState<string | null>(topicId)
  const [kind, setKind] = useState<string | null>(kindId)

  const pickTopic = async (value: string) => {
    if (value !== NEW_TOPIC) return setTopic(value || null)
    const made = await newTopic()
    if (made) setTopic(made.id)
  }
  const pickKind = async (value: string) => {
    if (value !== NEW_TOPIC) return setKind(value || null)
    const id = await newKind()
    if (id) setKind(id)
  }
  const create = () => {
    if (!text.trim()) return
    const id = newId()
    const input = { text: text.trim(), topic_id: topic, kind_id: kind, created_at: new Date().toISOString() }
    save.mutateAsync({ id, input }).catch((e: Error) => toast(`Not saved: ${e.message}`))
    onCreated(id)
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} dirty={Boolean(text.trim())} title="New observation"
      footer={<Button variant="tape" disabled={!text.trim()} onClick={create}>Save</Button>}>
      <div className="space-y-4">
        <Field label="What did you notice?">
          <Textarea autoFocus placeholder="Not a joke yet, just what you saw" value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Topic (optional)">
            <Select value={topic ?? ''} onChange={(e) => void pickTopic(e.target.value)}>
              <option value="">No topic</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{topicName(t)}</option>)}
              <option value={NEW_TOPIC}>New topic…</option>
            </Select>
          </Field>
          <Field label="Kind (optional)">
            <Select value={kind ?? ''} onChange={(e) => void pickKind(e.target.value)}>
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
