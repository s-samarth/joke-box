/** Write a new premise: the topic it's filed under, the take, and the reasoning behind it. */
import { useState } from 'react'
import { newId } from '../../api/client'
import { useTopics } from '../../api/library'
import { useSavePremise } from '../../api/premises'
import { Button } from '../../components/ui/Button'
import { Field, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { useFeedback } from '../../components/ui/feedbackContext'
import { topicName } from '../../lib/jokeMeta'
import { NEW_TOPIC, useNewTopic } from '../jokes/useNewTopic'
import { PremiseGuide } from './PremiseGuide'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The topic it starts filed under. */
  topicId?: string | null
  onCreated: (id: string) => void
}

export function NewPremiseDialog({ open, onOpenChange, topicId, onCreated }: Props) {
  const { data: topics = [] } = useTopics()
  const save = useSavePremise()
  const { toast } = useFeedback()
  const [topic, setTopic] = useState('')
  const [take, setTake] = useState('')
  const [notes, setNotes] = useState('')
  const chosen = topic || topicId || topics.find((t) => t.is_system)?.id || ''
  const newTopic = useNewTopic()
  const pickTopic = async (id: string) => {
    if (id !== NEW_TOPIC) return setTopic(id)
    const made = await newTopic()
    if (made) setTopic(made.id)
  }

  const close = () => {
    onOpenChange(false)
    setTopic('')
    setTake('')
    setNotes('')
  }
  const create = () => {
    if (!take.trim() || !chosen) return
    const id = newId()
    save.mutateAsync({ id, input: { topic_id: chosen, take: take.trim(), notes } }).catch((e: Error) => toast(`Not saved: ${e.message}`))
    onCreated(id)
    close()
  }

  return (
    <Modal open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())} dirty={Boolean(take.trim() || notes.trim())} title="New premise" wide
      footer={<Button variant="tape" disabled={!take.trim()} onClick={create}>Add premise</Button>}>
      <div className="space-y-4">
        <Field label="Topic">
          <Select value={chosen} onChange={(e) => pickTopic(e.target.value)}>
            {topics.map((t) => <option key={t.id} value={t.id}>{topicName(t)}</option>)}
            <option value={NEW_TOPIC}>New topic…</option>
          </Select>
        </Field>
        <Field label="Your take">
          <Textarea className="min-h-16" placeholder="X is Y" value={take} onChange={(e) => setTake(e.target.value)} />
        </Field>
        <Field label="Why it's true" hint="The because, and anything else worth keeping. Optional.">
          <Textarea placeholder="Because Z" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <PremiseGuide />
      </div>
    </Modal>
  )
}
