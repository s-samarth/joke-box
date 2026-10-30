/**
 * Every premise, under the topic it's filed in, with how many jokes rest on it. Its jokes can come
 * from any topic. The count of jokes on no premise yet links to them, to sort them in.
 */
import { ArrowLeft, Lightbulb, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useJokes, useTopics } from '../../api/library'
import { usePremises } from '../../api/premises'
import { Button } from '../../components/ui/Button'
import { EmptyState, Spinner } from '../../components/ui/pieces'
import { topicName } from '../../lib/jokeMeta'
import { NO_PREMISE, countByPremise, premiseSize } from '../../lib/premises'
import { NewPremiseDialog } from './NewPremiseDialog'

export function PremisesPage() {
  const { data: premises = [], isPending } = usePremises()
  const { data: topics = [] } = useTopics()
  const { data: jokes = [] } = useJokes()
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  const counts = countByPremise(jokes)
  const loose = jokes.filter((j) => !j.premise_id).length
  const groups = topics.map((t) => ({ topic: t, items: premises.filter((p) => p.topic_id === t.id) })).filter((g) => g.items.length > 0)

  return (
    <div className="mx-auto max-w-2xl pt-2 pb-16 lg:pt-10">
      <Link to="/jokes" className="inline-flex h-12 items-center gap-1.5 text-dim hover:text-paper lg:hidden"><ArrowLeft size={18} /> Jokes</Link>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="headline text-4xl">Premises</h2>
        <Button variant="tape" small icon={<Plus size={15} />} onClick={() => setCreating(true)}>New premise</Button>
      </div>
      <p className="max-w-xl text-sm text-dim">
        The idea under your jokes. One premise feeds many setups.
        {loose > 0 && <> <Link to={`/jokes?premise=${NO_PREMISE}`} className="text-tape hover:underline">{loose} {loose === 1 ? 'joke isn’t' : 'jokes aren’t'} on a premise yet.</Link></>}
      </p>
      {isPending ? (
        <div className="py-16"><Spinner /></div>
      ) : groups.length === 0 ? (
        <EmptyState title="No premises yet" action={<button type="button" onClick={() => setCreating(true)} className="text-tape hover:underline">Write your first premise</button>}>
          Write your take on a topic, then put the jokes that rest on it under it.
        </EmptyState>
      ) : (
        groups.map(({ topic, items }) => (
          <section key={topic.id} className="mt-8">
            <h3 className="text-sm text-dim">{topicName(topic)} <span className="text-faint">{items.length}</span></h3>
            <ul className="mt-2 divide-y divide-rule border-y border-rule">
              {items.map((p) => (
                <li key={p.id}>
                  <Link to={`/jokes/premises/${p.id}`} className="flex items-start gap-3 py-3 hover:text-tape">
                    <Lightbulb size={16} className="mt-1 shrink-0 text-faint" aria-hidden />
                    <span className="min-w-0 flex-1 leading-snug">
                      <span className="line-clamp-2">{p.take}</span>
                      <span className="mt-0.5 block text-xs text-faint">{premiseSize(counts.get(p.id) ?? 0)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
      <NewPremiseDialog open={creating} onOpenChange={setCreating} onCreated={(id) => navigate(`/jokes/premises/${id}`)} />
    </div>
  )
}
