/**
 * Write a premise in place, on Home: the take, and why it's true if you have it, in one box like
 * the joke box, filed under a topic (Random unless you pick one, and it stays picked). Linking
 * observations is on the premise's own page; Open in the toast takes you there.
 */
import { useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { newId } from '../../api/client'
import { useTopics } from '../../api/library'
import { useSavePremise } from '../../api/premises'
import { useFeedback } from '../../components/ui/feedbackContext'
import { announceSave } from '../../lib/announce'
import { randomTopicId } from '../../lib/jokeMeta'
import { TopicMenu } from '../observations/ObservationMenus'

const field = 'block w-full resize-none bg-transparent px-4 text-lg leading-snug outline-none placeholder:text-faint'

export function PremiseBox() {
  const [take, setTake] = useState('')
  const [notes, setNotes] = useState('')
  const [topicId, setTopicId] = useState<string | null>(null)
  const { data: topics = [] } = useTopics()
  const save = useSavePremise()
  const { toast } = useFeedback()
  const navigate = useNavigate()
  const topic = topicId ?? randomTopicId(topics) ?? null

  const submit = () => {
    if (!take.trim() || !topic) return
    const id = newId()
    const saving = save.mutateAsync({ id, input: { topic_id: topic, take: take.trim(), notes } })
    saving.catch((e: Error) => toast(`Not saved: ${e.message}`))
    setTake('')
    setNotes('')
    announceSave(saving, toast, 'Premise added', { label: 'Open', onClick: () => navigate(`/premises/${id}`) })
    document.getElementById('premise-take')?.focus()
  }
  const enterSaves = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit() }} className="rounded-xl bg-ink-2 ring-1 ring-rule-strong transition focus-within:ring-2 focus-within:ring-sky/60">
      <label htmlFor="premise-take" className="sr-only">Your take</label>
      <textarea id="premise-take" rows={2} value={take} onChange={(e) => setTake(e.target.value)} onKeyDown={enterSaves}
        placeholder="Your take: X is Y" className={`${field} pt-3.5 pb-2 text-paper`} />
      <div className="mx-4 h-px bg-rule" />
      <label htmlFor="premise-notes" className="sr-only">Why it's true (optional)</label>
      <textarea id="premise-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} onKeyDown={enterSaves}
        placeholder="Because… (optional)" className={`${field} pt-2 pb-2 text-dim`} />
      <div className="flex items-center gap-2 px-3 pb-3">
        <div className="flex min-w-0 flex-1" role="group" aria-label="File it under">
          <TopicMenu value={topicId} onChange={setTopicId} />
        </div>
        <button type="submit" disabled={!take.trim() || !topic} className="h-9 shrink-0 rounded-lg bg-paper px-3 text-[15px] font-medium text-ink transition disabled:bg-ink-4 disabled:text-faint">Add premise</button>
      </div>
    </form>
  )
}
