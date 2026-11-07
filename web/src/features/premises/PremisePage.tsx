/**
 * One premise: the take and its reasoning, edited in place, then the jokes resting on it as a
 * list or its web (see PremiseJokes). Write a new joke on it, or add ones you've written, from
 * any topic. Observations on its topic open beside it (see ObservationsSide), to add to the
 * reasoning or start a joke on it.
 */
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useJokes, useTopics } from '../../api/library'
import { useDeletePremise, usePremises, type Premise } from '../../api/premises'
import { Button } from '../../components/ui/Button'
import { Field, GrowingText, Select, Textarea } from '../../components/ui/Field'
import { useFeedback } from '../../components/ui/feedbackContext'
import { EmptyState, Spinner } from '../../components/ui/pieces'
import { topicName } from '../../lib/jokeMeta'
import { jokesOn } from '../../lib/premises'
import { formatDateTime } from '../../lib/time'
import { useCapture } from '../capture/captureContext'
import { NEW_TOPIC, useNewTopic } from '../jokes/useNewTopic'
import { withObservation } from '../observations/observationMeta'
import { ObservationsButton, ObservationsSide } from '../observations/ObservationsSide'
import { PremiseGuide } from './PremiseGuide'
import { PremiseJokes } from './PremiseJokes'
import { usePremiseDraft } from './usePremiseDraft'

function Editor({ premise }: { premise: Premise }) {
  const { draft, update } = usePremiseDraft(premise)
  const { data: topics = [] } = useTopics()
  const { data: all = [] } = useJokes()
  const remove = useDeletePremise()
  const { confirm, toast } = useFeedback()
  const { openCapture } = useCapture()
  const navigate = useNavigate()
  const { search } = useLocation()
  const newTopic = useNewTopic()
  const pickTopic = async (id: string) => {
    if (id !== NEW_TOPIC) return update({ topic_id: id })
    const made = await newTopic()
    if (made) update({ topic_id: made.id })
  }
  const hasJokes = jokesOn(premise.id, all).length > 0

  const onDelete = async () => {
    const ok = await confirm({ title: 'Delete this premise?', message: 'It goes to the Trash for 30 days. Its jokes stay where they are, just not on a premise, until you put it back.', confirmLabel: 'Delete premise', danger: true })
    if (!ok) return
    remove.mutate(premise.id, { onError: (e) => toast(`Not deleted: ${e.message}`) })
    navigate(`/premises${search}`)
  }

  return (
    <article className="mx-auto max-w-2xl pb-10">
      <Link to={`/premises${search}`} className="inline-flex h-12 items-center gap-1.5 text-dim hover:text-paper lg:hidden"><ArrowLeft size={18} /> Premises</Link>
      <GrowingText aria-label="Your take" placeholder="Your take: X is Y" className="mt-2 lg:mt-10 text-[26px] leading-tight font-medium sm:text-[30px]"
        value={draft.take} onChange={(e) => update({ take: e.target.value })} />
      {!draft.take.trim() && <p className="mt-2 text-sm text-light">A premise needs a take to be saved.</p>}
      <div className="mt-6 grid gap-4">
        <div className="space-y-1.5">
          <div className="-my-1 flex items-center justify-between gap-2">
            <label htmlFor="premise-notes" className="text-sm text-dim">Why it's true</label>
            <ObservationsButton topicId={draft.topic_id} />
          </div>
          <Textarea id="premise-notes" placeholder="Because… and anything else worth keeping" value={draft.notes} onChange={(e) => update({ notes: e.target.value })} />
        </div>
        <Field label="Topic">
          <Select value={draft.topic_id} onChange={(e) => pickTopic(e.target.value)} className="block sm:max-w-xs">
            {topics.map((t) => <option key={t.id} value={t.id}>{topicName(t)}</option>)}
            <option value={NEW_TOPIC}>New topic…</option>
          </Select>
        </Field>
        <PremiseGuide open={!hasJokes && !premise.notes.trim()} />
      </div>

      <PremiseJokes premise={premise} topicId={draft.topic_id} all={all} topics={topics} />
      <ObservationsSide topicId={draft.topic_id} addedLabel="In why it’s true" isAdded={(o) => draft.notes.includes(o.text)} addLabel="Add to why it’s true"
        onAdd={(o) => { update({ notes: withObservation(draft.notes, o.text) }); toast('Added to why it’s true') }}
        onWrite={(o) => openCapture({ setup: o.text, topicId: draft.topic_id, premiseId: premise.id })} />

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5 text-sm text-faint">
        <span>Written {formatDateTime(premise.created_at)}.</span>
        <Button variant="danger" small icon={<Trash2 size={15} />} onClick={onDelete}>Delete premise</Button>
      </footer>
    </article>
  )
}

export function PremisePage() {
  const { premiseId } = useParams()
  const { data: premises, isPending } = usePremises()
  const premise = premises?.find((p) => p.id === premiseId)
  if (isPending && !premises) return <div className="py-16"><Spinner /></div>
  if (!premise) return <EmptyState title="Premise not found" action={<Link to="/premises" className="text-tape">All premises</Link>}>It may have been deleted.</EmptyState>
  return <Editor key={premise.id} premise={premise} />
}
