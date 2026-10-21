/**
 * Log something you noticed. Not a joke, just the observation, optionally under one of your
 * observation topics (or a new one made right here). The topic you pick stays picked, so you
 * can log a run of things about the same subject.
 */
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { newId } from '../../api/client'
import { useObservationTopics, useSaveObservation } from '../../api/notebook'
import { useFeedback } from '../../components/ui/feedbackContext'
import { useNewObservationTopic } from './useNewObservationTopic'
import { isOnline } from '../../api/network'

const chip = (on: boolean) =>
  `h-8 shrink-0 rounded-lg px-2.5 text-sm transition ${on ? 'bg-paper text-ink font-medium' : 'bg-ink-3 text-dim hover:text-paper'}`

export function ObservationBox({ initialTopicId = null }: { initialTopicId?: string | null }) {
  const [text, setText] = useState('')
  const [topicId, setTopicId] = useState<string | null>(initialTopicId)
  const { data: topics = [] } = useObservationTopics()
  const save = useSaveObservation()
  const newTopic = useNewObservationTopic()
  const { toast } = useFeedback()

  const submit = () => {
    if (!text.trim()) return
    save.mutate({ id: newId(), input: { text: text.trim(), topic_id: topicId, created_at: new Date().toISOString() } }, { onError: (e) => toast(`Not saved: ${e.message}`) })
    setText('')
    if (!isOnline()) toast('Saved offline, will sync')
  }
  const addTopic = async () => {
    const id = await newTopic()
    if (id) setTopicId(id)
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit() }} className="rounded-xl bg-ink-2 ring-1 ring-rule transition focus-within:ring-2 focus-within:ring-paper/40">
      <label htmlFor="observation-text" className="sr-only">Observation</label>
      <textarea id="observation-text" rows={2} value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
        placeholder="What did you notice? (not a joke yet)"
        className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-lg leading-snug text-paper outline-none placeholder:text-faint" />
      <div className="flex items-center gap-2 px-3 pb-3">
        {/* Chips scroll sideways on a phone instead of wrapping into a tall block. */}
        <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto" role="group" aria-label="Observation topic">
          <button type="button" aria-pressed={topicId === null} onClick={() => setTopicId(null)} className={chip(topicId === null)}>No topic</button>
          {topics.map((t) => (
            <button key={t.id} type="button" aria-pressed={topicId === t.id} onClick={() => setTopicId(t.id)} className={chip(topicId === t.id)}>{t.name}</button>
          ))}
          <button type="button" onClick={addTopic} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-sm text-tape hover:bg-ink-3"><Plus size={15} />New topic</button>
        </div>
        <button type="submit" disabled={!text.trim()} className="h-9 shrink-0 rounded-lg bg-paper px-3 text-[15px] font-medium text-ink transition disabled:bg-ink-4 disabled:text-faint">Log it</button>
      </div>
    </form>
  )
}
