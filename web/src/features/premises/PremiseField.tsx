/**
 * "Premise" on a joke: the idea it rests on, picked from every premise you have. A joke from any
 * topic can rest on any premise, so the list isn't limited to the joke's topic; that topic's
 * premises just come first.
 */
import { Lightbulb, Plus, Search, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useTopics } from '../../api/library'
import { usePremises } from '../../api/premises'
import { Input } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { topicName } from '../../lib/jokeMeta'
import { NewPremiseDialog } from './NewPremiseDialog'

const chip = 'inline-flex h-10 items-center gap-2 rounded-lg bg-ink-3 px-3 text-[15px] hover:bg-ink-4'

interface Props {
  value: string | null
  /** The joke's topic: its premises are listed first, and a new premise starts there. */
  topicId: string
  onChange: (id: string | null) => void
}

export function PremiseField({ value, topicId, onChange }: Props) {
  const { data: premises = [] } = usePremises()
  const { data: topics = [] } = useTopics()
  const [picking, setPicking] = useState(false)
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState('')
  const current = premises.find((p) => p.id === value)
  const needle = q.trim().toLowerCase()
  const order = [topicId, ...topics.map((t) => t.id).filter((id) => id !== topicId)]
  const groups = order
    .map((id) => ({ topic: topics.find((t) => t.id === id), items: premises.filter((p) => p.topic_id === id && p.take.toLowerCase().includes(needle)) }))
    .filter((g) => g.items.length > 0)
  const pick = (id: string | null) => {
    onChange(id)
    setPicking(false)
    setQ('')
  }

  return (
    <>
      {value ? (
        <div className="space-y-2">
          {current
            ? <Link to={`/jokes/premises/${current.id}`} className="line-clamp-2 rounded-lg bg-ink-3 px-3 py-2.5 leading-snug hover:bg-ink-4">{current.take}</Link>
            : <p className="text-dim">A premise that's been deleted</p>}
          <div className="flex gap-5 text-sm">
            <button type="button" onClick={() => setPicking(true)} className="text-tape hover:underline">Change</button>
            <button type="button" onClick={() => onChange(null)} className="inline-flex items-center gap-1 text-dim hover:text-paper"><X size={14} /> Remove</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setPicking(true)} className={`${chip} text-dim hover:text-paper`}><Lightbulb size={16} /> Add to a premise</button>
      )}
      <Modal open={picking} onOpenChange={setPicking} title="Which premise does it rest on?" description="Any premise, from any topic.">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
          <Input type="search" aria-label="Search premises" placeholder="Search premises" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="mt-3 max-h-[50dvh] overflow-y-auto">
          {groups.length === 0 && <p className="py-6 text-dim">{premises.length ? 'No premises match.' : 'No premises yet.'}</p>}
          {groups.map((g) => (
            <section key={g.topic?.id} className="mb-3">
              <h3 className="py-1 text-xs text-faint">{topicName(g.topic)}</h3>
              <ul className="divide-y divide-rule">
                {g.items.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => pick(p.id)} aria-pressed={p.id === value}
                      className={`w-full py-3 text-left leading-snug hover:text-tape ${p.id === value ? 'text-tape' : ''}`}>
                      <span className="line-clamp-2">{p.take}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <button type="button" onClick={() => setCreating(true)} className={`${chip} mt-2 text-dim hover:text-paper`}><Plus size={16} /> New premise</button>
      </Modal>
      <NewPremiseDialog open={creating} onOpenChange={setCreating} topicId={topicId} onCreated={pick} />
    </>
  )
}
