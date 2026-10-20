/** Topic, subtopic and status pickers, each able to create a new option inline. */
import { useState } from 'react'
import { useStatuses, useTopicActions, useTopics } from '../../../api/library'
import { Field, Select } from '../../../components/ui/Field'
import { useFeedback } from '../../../components/ui/feedbackContext'
import type { Draft } from '../useBitDraft'

const NEW = '__new__'

interface Props {
  draft: Draft
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void
}

export function PlacementFields({ draft, set }: Props) {
  const { data: topics = [] } = useTopics()
  const { data: statuses = [] } = useStatuses()
  const actions = useTopicActions()
  const { prompt, toast } = useFeedback()
  const [extraStatuses, setExtraStatuses] = useState<string[]>([])
  const topic = topics.find((t) => t.id === draft.topicId)
  const statusNames = [...statuses.map((s) => s.name), ...extraStatuses]
  if (draft.status && !statusNames.includes(draft.status)) statusNames.push(draft.status)

  const onTopic = async (id: string) => {
    const pick = (topicId: string) => {
      set('topicId', topicId)
      set('subtopicId', null)
    }
    if (id !== NEW) return pick(id)
    const name = await prompt({ title: 'New topic', label: 'Topic name', confirmLabel: 'Create' })
    if (!name) return
    actions.create.mutate(name, {
      onSuccess: (t) => pick(t.id),
      onError: (e) => toast(e.message),
    })
  }

  const onSubtopic = async (id: string) => {
    if (id !== NEW) return set('subtopicId', id || null)
    const name = await prompt({ title: `New subtopic in ${topic?.name}`, label: 'Subtopic name', confirmLabel: 'Create' })
    if (!name || !topic) return
    actions.addSubtopic.mutate(
      { topicId: topic.id, name },
      { onSuccess: (s) => set('subtopicId', s.id), onError: (e) => toast(e.message) },
    )
  }

  const onStatus = async (value: string) => {
    if (value !== NEW) return set('status', value || null)
    const name = await prompt({ title: 'New status', label: 'e.g. Needs a tag', confirmLabel: 'Add' })
    if (!name) return
    setExtraStatuses((s) => [...s, name])
    set('status', name)
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Topic">
        <Select value={draft.topicId} onChange={(e) => onTopic(e.target.value)}>
          {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          <option value={NEW}>+ New topic…</option>
        </Select>
      </Field>
      <Field label="Subtopic">
        <Select value={draft.subtopicId ?? ''} onChange={(e) => onSubtopic(e.target.value)}>
          <option value="">None</option>
          {topic?.subtopics.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          <option value={NEW}>+ New subtopic…</option>
        </Select>
      </Field>
      <Field label="Status">
        <Select value={draft.status ?? ''} onChange={(e) => onStatus(e.target.value)}>
          <option value="">No status</option>
          {statusNames.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value={NEW}>+ New status…</option>
        </Select>
      </Field>
    </div>
  )
}
