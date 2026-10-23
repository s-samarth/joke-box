/** Everything about a joke beyond the words, as rows you edit in place. */
import { useMemo, useState, type ReactNode } from 'react'
import { useJokes, useStatuses, useTopicActions, useTopics } from '../../api/library'
import type { JokeInput } from '../../api/types'
import { Select } from '../../components/ui/Field'
import { useFeedback } from '../../components/ui/feedbackContext'
import { useCapture } from '../capture/captureContext'
import { LANGUAGES, statusOf, topicName } from '../../lib/jokeMeta'
import { followersOf } from '../../lib/chains'
import { FollowedBy, FollowsField } from './ChainFields'
import { CleanPicker, HashtagField, StrengthPicker, TypeToggles } from './DetailControls'
import { RuntimeField } from './RuntimeField'
import { TopicManager } from './TopicManager'
import { TypeManager } from './TypeManager'

const NEW = '__new__'

/** A label and its control. `edit` adds a small button that opens the manager for the whole list. */
function Row({ label, edit, children }: { label: string; edit?: { label: string; open: () => void }; children: ReactNode }) {
  return (
    <div className="grid gap-2 py-3.5 sm:grid-cols-[8.5rem_1fr] sm:items-center sm:gap-4">
      <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:gap-0.5">
        <span className="text-sm text-dim">{label}</span>
        {edit && <button type="button" onClick={edit.open} className="text-sm text-tape hover:underline">{edit.label}</button>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** `jokeId` is the joke being edited; none while writing a new one. */
export function JokeDetails({ jokeId, draft, update }: { jokeId?: string; draft: JokeInput; update: (p: Partial<JokeInput>) => void }) {
  const { data: topics = [] } = useTopics()
  const { data: statuses = [] } = useStatuses()
  const { data: jokes = [] } = useJokes()
  const actions = useTopicActions()
  const { prompt, toast } = useFeedback()
  const [managing, setManaging] = useState<'topics' | 'types' | null>(null)
  const topic = topics.find((t) => t.id === draft.topic_id)
  const status = statusOf(draft.status)
  const statusNames = statuses.map((s) => s.name)
  if (!statusNames.includes(status)) statusNames.push(status)
  // Older jokes may have no language or another one; show it rather than pretend it's Hinglish.
  const languages = draft.language && !LANGUAGES.includes(draft.language) ? [...LANGUAGES, draft.language] : LANGUAGES
  const next = jokeId ? followersOf(jokeId, jokes) : []
  const { openCapture } = useCapture()
  const hashtags = useMemo(() => [...new Set(jokes.flatMap((b) => b.hashtags))].sort(), [jokes])

  // Keep this joke's draft in step with the managers (the server already moved saved jokes).
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
  const typeRenamed = (from: string, to: string) =>
    update({ types: [...new Set(draft.types.map((t) => (same(t, from) ? to : t)))] })
  const typeRemoved = (name: string) => update({ types: draft.types.filter((t) => !same(t, name)) })
  const topicRemoved = (id: string) => {
    if (draft.topic_id === id) update({ topic_id: topics.find((t) => t.is_system)?.id ?? '', subtopic_id: null })
    else if (draft.subtopic_id === id) update({ subtopic_id: null })
  }

  const pickTopic = async (id: string) => {
    if (id !== NEW) return update({ topic_id: id, subtopic_id: null })
    const name = await prompt({ title: 'New topic', label: 'Topic name', confirmLabel: 'Add topic' })
    if (name) actions.create.mutate(name, { onSuccess: (t) => update({ topic_id: t.id, subtopic_id: null }), onError: (e) => toast(e.message) })
  }
  const pickSub = async (id: string) => {
    if (id !== NEW) return update({ subtopic_id: id || null })
    const name = await prompt({ title: `New subtopic in ${topicName(topic)}`, label: 'Subtopic name', confirmLabel: 'Add subtopic' })
    if (name && topic) actions.addSubtopic.mutate({ topicId: topic.id, name }, { onSuccess: (s) => update({ subtopic_id: s.id }), onError: (e) => toast(e.message) })
  }
  const pickStatus = async (value: string) => {
    if (value !== NEW) return update({ status: value })
    const name = await prompt({ title: 'New status', label: 'e.g. Ready to record', confirmLabel: 'Add status' })
    if (name) update({ status: name })
  }

  return (
    <div className="divide-y divide-rule border-y border-rule">
      <Row label="Strength"><StrengthPicker value={draft.strength} onChange={(strength) => update({ strength })} /></Row>
      <Row label="Type" edit={{ label: 'Edit types', open: () => setManaging('types') }}><TypeToggles value={draft.types} onChange={(types) => update({ types })} /></Row>
      <Row label="Filed under" edit={{ label: 'Edit topics', open: () => setManaging('topics') }}>
        <div className="grid grid-cols-2 gap-2">
          <Select aria-label="Topic" value={draft.topic_id} onChange={(e) => pickTopic(e.target.value)}>
            {topics.map((t) => <option key={t.id} value={t.id}>{topicName(t)}</option>)}
            <option value={NEW}>New topic…</option>
          </Select>
          <Select aria-label="Subtopic" value={draft.subtopic_id ?? ''} onChange={(e) => pickSub(e.target.value)}>
            <option value="">No subtopic</option>
            {topic?.subtopics.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            <option value={NEW}>New subtopic…</option>
          </Select>
        </div>
      </Row>
      <Row label="Follows"><FollowsField jokeId={jokeId} value={draft.follows_id ?? null} onChange={(follows_id) => update({ follows_id })} /></Row>
      {jokeId && (
        <Row label="Followed by">
          {/* The next joke starts filed where this one is, already following it. */}
          <FollowedBy next={next} onWriteNext={() => openCapture({ topicId: draft.topic_id, subtopicId: draft.subtopic_id, followsId: jokeId })} />
        </Row>
      )}
      <Row label="Status">
        <Select aria-label="Status" value={status} onChange={(e) => pickStatus(e.target.value)} className="sm:max-w-xs">
          {statusNames.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value={NEW}>New status…</option>
        </Select>
      </Row>
      <Row label="Runs for"><RuntimeField value={draft.duration_seconds} onChange={(duration_seconds) => update({ duration_seconds })} /></Row>
      <Row label="Clean rating"><CleanPicker value={draft.clean_rating} onChange={(clean_rating) => update({ clean_rating })} /></Row>
      <Row label="Language">
        <Select aria-label="Language" value={draft.language ?? ''} onChange={(e) => update({ language: e.target.value || null })} className="sm:max-w-xs">
          {!draft.language && <option value="">Not set</option>}
          {languages.map((l) => <option key={l} value={l}>{l}</option>)}
        </Select>
      </Row>
      <Row label="Hashtags"><HashtagField value={draft.hashtags} onChange={(h) => update({ hashtags: h })} suggestions={hashtags} /></Row>
      <TopicManager open={managing === 'topics'} onClose={() => setManaging(null)} onRemoved={topicRemoved} />
      <TypeManager open={managing === 'types'} onClose={() => setManaging(null)} onRenamed={typeRenamed} onRemoved={typeRemoved} />
    </div>
  )
}
