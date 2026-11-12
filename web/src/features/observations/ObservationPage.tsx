/**
 * One observation, as its own page: the words, edited in place; its topic and kind, both
 * optional; Notes, for anything more about it; then what came from it (see ObservationUses), with a joke or premise a tap away to
 * write from it. Every change saves on its own.
 */
import { ArrowLeft, Lightbulb, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { useTopics } from '../../api/library'
import { useDeleteObservation, useObservationKinds, useObservations } from '../../api/notebook'
import { usePremises } from '../../api/premises'
import type { Observation } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { Field, GrowingText, Select } from '../../components/ui/Field'
import { useFeedback } from '../../components/ui/feedbackContext'
import { NotesBox } from '../../components/ui/NotesBox'
import { EmptyState, Spinner } from '../../components/ui/pieces'
import { randomTopicId, topicName } from '../../lib/jokeMeta'
import { formatDateTime } from '../../lib/time'
import { useCapture } from '../capture/captureContext'
import { NEW_TOPIC, useNewTopic } from '../jokes/useNewTopic'
import { NewPremiseDialog } from '../premises/NewPremiseDialog'
import { PLAIN } from './observationMeta'
import { ObservationUses } from './ObservationUses'
import { useNewKind } from './useNewKind'
import { useObservationDraft } from './useObservationDraft'

function Editor({ observation }: { observation: Observation }) {
  const { draft, update } = useObservationDraft(observation)
  const { data: topics = [] } = useTopics()
  const { data: kinds = [] } = useObservationKinds()
  const remove = useDeleteObservation()
  const { openCapture } = useCapture()
  const { confirm, toast } = useFeedback()
  const navigate = useNavigate()
  const { search } = useLocation()
  const newTopic = useNewTopic()
  const newKind = useNewKind()
  const [writingPremise, setWritingPremise] = useState(false)
  const { data: premises = [] } = usePremises()
  // Came to one premise already? A joke written from it most likely rests there too.
  const live = premises.filter((p) => (observation.premise_ids ?? []).includes(p.id))
  const onlyPremise = live.length === 1 ? live[0].id : null

  const pickTopic = async (value: string) => {
    if (value !== NEW_TOPIC) return update({ topic_id: value })
    const made = await newTopic()
    if (made) update({ topic_id: made.id })
  }
  const pickKind = async (value: string) => {
    if (value !== NEW_TOPIC) return update({ kind_id: value || null })
    const id = await newKind()
    if (id) update({ kind_id: id })
  }
  const onDelete = async () => {
    if (!(await confirm({ title: 'Delete this observation?', message: 'It goes to the Trash for 30 days. Jokes and premises from it stay.', confirmLabel: 'Delete', danger: true }))) return
    remove.mutate(observation.id, { onError: (e) => toast(`Not deleted: ${e.message}`) })
    navigate(`/observations${search}`)
  }

  return (
    <article className="mx-auto max-w-2xl pb-10">
      <Link to={`/observations${search}`} className="inline-flex h-12 items-center gap-1.5 text-dim hover:text-paper lg:hidden"><ArrowLeft size={18} /> Observations</Link>
      <GrowingText aria-label="What you noticed" placeholder="What you noticed" className="mt-2 text-[22px] leading-snug sm:text-[24px] lg:mt-10"
        value={draft.text} onChange={(e) => update({ text: e.target.value })} />
      {!draft.text.trim() && <p className="mt-2 text-sm text-light">An observation needs some words to be saved.</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Topic">
          <Select value={draft.topic_id ?? randomTopicId(topics) ?? ''} onChange={(e) => void pickTopic(e.target.value)}>
            {topics.map((t) => <option key={t.id} value={t.id}>{topicName(t)}</option>)}
            <option value={NEW_TOPIC}>New topic…</option>
          </Select>
        </Field>
        <Field label="Kind (optional)">
          <Select value={draft.kind_id ?? ''} onChange={(e) => void pickKind(e.target.value)}>
            <option value="">{PLAIN}</option>
            {kinds.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
            <option value={NEW_TOPIC}>New kind…</option>
          </Select>
        </Field>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="tape" small icon={<Sparkles size={15} />}
          onClick={() => openCapture({ topicId: draft.topic_id ?? undefined, premiseId: onlyPremise, observationIds: [observation.id] })}>Write a joke from it</Button>
        <Button variant="plain" small icon={<Lightbulb size={15} />} onClick={() => setWritingPremise(true)}>Write a premise from it</Button>
      </div>

      <NotesBox value={draft.extra_notes ?? ''} onChange={(extra_notes) => update({ extra_notes })} />

      <ObservationUses observation={observation} />

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5 text-sm text-faint">
        <span>Noticed {formatDateTime(observation.created_at)}.</span>
        <Button variant="danger" small icon={<Trash2 size={15} />} onClick={onDelete}>Delete observation</Button>
      </footer>
      {writingPremise && (
        <NewPremiseDialog open onOpenChange={(o) => !o && setWritingPremise(false)} topicId={draft.topic_id} observationIds={[observation.id]}
          onCreated={() => { setWritingPremise(false); toast('Premise written. It’s under Premises from it.') }} />
      )}
    </article>
  )
}

export function ObservationPage() {
  const { observationId } = useParams()
  const { data: observations, isPending } = useObservations()
  const observation = observations?.find((o) => o.id === observationId)
  if (isPending && !observations) return <div className="py-16"><Spinner /></div>
  if (!observation) return <EmptyState title="Observation not found" action={<Link to="/observations" className="text-tape">All observations</Link>}>It may have been deleted.</EmptyState>
  return <Editor key={observation.id} observation={observation} />
}
