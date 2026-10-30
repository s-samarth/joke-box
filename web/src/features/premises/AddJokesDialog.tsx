/**
 * Put jokes you've already written on a premise: tick as many as you like, from any topic. A
 * joke resting on another premise moves to this one.
 */
import { Search } from 'lucide-react'
import { useState } from 'react'
import { useJokes, useSaveJoke, useTopics } from '../../api/library'
import { usePremises, type Premise } from '../../api/premises'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { topicName } from '../../lib/jokeMeta'
import { toInput } from '../jokes/useAutosaveJoke'
import { matchesSearch } from '../jokes/useJokeFilters'

const ANY = ''

export function AddJokesDialog({ premise, open, onOpenChange }: { premise: Premise; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: jokes = [] } = useJokes()
  const { data: topics = [] } = useTopics()
  const { data: premises = [] } = usePremises()
  const save = useSaveJoke()
  const [q, setQ] = useState('')
  const [topic, setTopic] = useState(ANY)
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const shown = jokes.filter((j) => j.premise_id !== premise.id && (topic === ANY || j.topic_id === topic) && matchesSearch(j, q))
  const takeOf = (id: string | null) => premises.find((p) => p.id === id)?.take

  const toggle = (id: string) => setTicked((t) => {
    const next = new Set(t)
    if (!next.delete(id)) next.add(id)
    return next
  })
  const close = () => {
    onOpenChange(false)
    setTicked(new Set())
    setQ('')
  }
  const add = () => {
    for (const j of jokes) if (ticked.has(j.id)) save.mutate({ id: j.id, input: { ...toInput(j), premise_id: premise.id } })
    close()
  }

  return (
    <Modal open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())} title="Add jokes to this premise" description="From any topic." wide
      footer={<Button variant="tape" disabled={!ticked.size} onClick={add}>{ticked.size ? `Add ${ticked.size} ${ticked.size === 1 ? 'joke' : 'jokes'}` : 'Add jokes'}</Button>}>
      <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
          <Input type="search" aria-label="Search jokes" placeholder="Search jokes" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select aria-label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value={ANY}>All topics</option>
          {topics.map((t) => <option key={t.id} value={t.id}>{topicName(t)}</option>)}
        </Select>
      </div>
      <ul className="mt-3 max-h-[50dvh] divide-y divide-rule overflow-y-auto">
        {shown.length === 0 && <li className="py-6 text-dim">No jokes match.</li>}
        {shown.map((j) => (
          <li key={j.id}>
            <label className="flex cursor-pointer items-start gap-3 py-3">
              <input type="checkbox" className="mt-1 size-4 accent-[var(--color-tape)]" checked={ticked.has(j.id)} onChange={() => toggle(j.id)} />
              <span className="min-w-0 leading-snug">
                <span className="line-clamp-2">{j.setup}</span>
                {j.premise_id && takeOf(j.premise_id) && <span className="mt-0.5 line-clamp-1 text-xs text-faint">Moves from: {takeOf(j.premise_id)}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
