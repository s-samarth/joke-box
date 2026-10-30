/**
 * One premise: the take and its reasoning, edited in place, then the jokes resting on it in
 * reading order (chains kept together). Write a new joke on it, or add ones you've written,
 * from any topic.
 */
import { ArrowLeft, ListPlus, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useJokes, useSaveJoke, useTopics } from '../../api/library'
import { useDeletePremise, usePremises, type Premise } from '../../api/premises'
import { Button, IconButton } from '../../components/ui/Button'
import { Field, GrowingText, Select, Textarea } from '../../components/ui/Field'
import { useFeedback } from '../../components/ui/feedbackContext'
import { EmptyState, Spinner, StrengthTicks } from '../../components/ui/pieces'
import { long } from '../../lib/duration'
import { topicName } from '../../lib/jokeMeta'
import { jokesOn, premiseSize } from '../../lib/premises'
import { formatDateTime } from '../../lib/time'
import { useCapture } from '../capture/captureContext'
import { toInput } from '../jokes/useAutosaveJoke'
import { AddJokesDialog } from './AddJokesDialog'
import { PremiseGuide } from './PremiseGuide'
import { usePremiseDraft } from './usePremiseDraft'

function Editor({ premise }: { premise: Premise }) {
  const { draft, update } = usePremiseDraft(premise)
  const { data: topics = [] } = useTopics()
  const { data: all = [] } = useJokes()
  const saveJoke = useSaveJoke()
  const remove = useDeletePremise()
  const { openCapture } = useCapture()
  const { confirm, toast } = useFeedback()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const jokes = jokesOn(premise.id, all)
  const runtime = jokes.reduce((s, j) => s + j.duration_seconds, 0)

  const detach = (id: string) => {
    const joke = all.find((j) => j.id === id)
    if (joke) saveJoke.mutate({ id, input: { ...toInput(joke), premise_id: null } })
  }
  const onDelete = async () => {
    const ok = await confirm({ title: 'Delete this premise?', message: 'Its jokes stay where they are, just not on a premise. This can’t be undone.', confirmLabel: 'Delete premise', danger: true })
    if (!ok) return
    remove.mutate(premise.id, { onError: (e) => toast(`Not deleted: ${e.message}`) })
    navigate('/jokes/premises')
  }

  return (
    <article className="mx-auto max-w-2xl pb-10">
      <Link to="/jokes/premises" className="inline-flex h-12 items-center gap-1.5 text-dim hover:text-paper"><ArrowLeft size={18} /> Premises</Link>
      <GrowingText aria-label="Your take" placeholder="Your take: X is Y" className="mt-2 text-[26px] leading-tight font-medium sm:text-[30px]"
        value={draft.take} onChange={(e) => update({ take: e.target.value })} />
      {!draft.take.trim() && <p className="mt-2 text-sm text-light">A premise needs a take to be saved.</p>}
      <div className="mt-6 grid gap-4">
        <Field label="Why it's true">
          <Textarea placeholder="Because… and anything else worth keeping" value={draft.notes} onChange={(e) => update({ notes: e.target.value })} />
        </Field>
        <Field label="Topic">
          <Select value={draft.topic_id} onChange={(e) => update({ topic_id: e.target.value })} className="block sm:max-w-xs">
            {topics.map((t) => <option key={t.id} value={t.id}>{topicName(t)}</option>)}
          </Select>
        </Field>
        <PremiseGuide />
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="headline text-2xl">Jokes on it</h2>
          <p className="text-sm text-dim">{premiseSize(jokes.length)}{runtime > 0 && `, ${long(runtime)}`}</p>
        </div>
        {jokes.length === 0 ? (
          <p className="mt-3 text-[15px] text-dim">One premise feeds many setups. Ask "if this is true, what else is true?" and write each answer as a joke.</p>
        ) : (
          <ol className="mt-3 divide-y divide-rule border-y border-rule">
            {jokes.map((j) => (
              <li key={j.id} className="flex items-start gap-2 py-3">
                <Link to={`/jokes/${j.id}`} className="min-w-0 flex-1 leading-snug hover:text-tape">
                  <span className="line-clamp-2">{j.setup}</span>
                  <span className="mt-1 flex items-center gap-3 text-xs text-faint">
                    <StrengthTicks strength={j.strength} />
                    {j.topic_id !== draft.topic_id && topicName(topics.find((t) => t.id === j.topic_id))}
                  </span>
                </Link>
                <IconButton label="Take it off this premise" onClick={() => detach(j.id)}><X size={16} /></IconButton>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="tape" small icon={<Plus size={15} />} onClick={() => openCapture({ topicId: draft.topic_id, premiseId: premise.id })}>Write a joke on it</Button>
          <Button variant="quiet" small icon={<ListPlus size={15} />} onClick={() => setAdding(true)}>Add jokes you’ve written</Button>
        </div>
      </section>

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5 text-sm text-faint">
        <span>Written {formatDateTime(premise.created_at)}.</span>
        <Button variant="danger" small icon={<Trash2 size={15} />} onClick={onDelete}>Delete premise</Button>
      </footer>
      <AddJokesDialog premise={premise} open={adding} onOpenChange={setAdding} />
    </article>
  )
}

export function PremisePage() {
  const { premiseId } = useParams()
  const { data: premises, isPending } = usePremises()
  const premise = premises?.find((p) => p.id === premiseId)
  if (isPending && !premises) return <div className="py-16"><Spinner /></div>
  if (!premise) return <EmptyState title="Premise not found" action={<Link to="/jokes/premises" className="text-tape">All premises</Link>}>It may have been deleted.</EmptyState>
  return <Editor key={premise.id} premise={premise} />
}
