/**
 * Log something you noticed. Not a joke, just the observation, filed under a topic (the joke
 * topics) and a kind if it isn't a plain observation. Both stay picked, so you can log a run of
 * things about the same subject.
 */
import { useState } from 'react'
import { newId } from '../../api/client'
import { useSaveObservation } from '../../api/notebook'
import { useFeedback } from '../../components/ui/feedbackContext'
import { announceSave } from '../../lib/announce'
import { KindMenu, TopicMenu } from './ObservationMenus'

interface Props {
  initialTopicId?: string | null
  initialKindId?: string | null
}

export function ObservationBox({ initialTopicId = null, initialKindId = null }: Props) {
  const [text, setText] = useState('')
  const [topicId, setTopicId] = useState<string | null>(initialTopicId)
  const [kindId, setKindId] = useState<string | null>(initialKindId)
  const save = useSaveObservation()
  const { toast } = useFeedback()

  const submit = () => {
    if (!text.trim()) return
    const input = { text: text.trim(), topic_id: topicId, kind_id: kindId, created_at: new Date().toISOString() }
    const saving = save.mutateAsync({ id: newId(), input })
    saving.catch((e: Error) => toast(`Not saved: ${e.message}`))
    setText('')
    announceSave(saving, toast, null)
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit() }} className="rounded-xl bg-ink-2 ring-1 ring-rule transition focus-within:ring-2 focus-within:ring-paper/40">
      <label htmlFor="observation-text" className="sr-only">Observation</label>
      <textarea id="observation-text" rows={2} value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
        placeholder="What did you notice? (not a joke yet)"
        className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-lg leading-snug text-paper outline-none placeholder:text-faint" />
      <div className="flex items-center gap-2 px-3 pb-3">
        <div className="flex min-w-0 flex-1 gap-1.5" role="group" aria-label="File it under">
          <TopicMenu value={topicId} onChange={setTopicId} />
          <KindMenu value={kindId} onChange={setKindId} />
        </div>
        <button type="submit" disabled={!text.trim()} className="h-9 shrink-0 rounded-lg bg-paper px-3 text-[15px] font-medium text-ink transition disabled:bg-ink-4 disabled:text-faint">Log it</button>
      </div>
    </form>
  )
}
