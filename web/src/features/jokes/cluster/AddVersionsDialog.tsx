/**
 * Put jokes you've already written into a cluster: tick as many as you like, from any topic, like
 * adding jokes to a premise. Jokes from the lead's subtopic come first, then its topic, since
 * versions usually sit together. A joke in another cluster moves here.
 */
import { Search } from 'lucide-react'
import { useState } from 'react'
import { useClusters } from '../../../api/clusters'
import { useJokes, useSaveJoke, useTopics } from '../../../api/library'
import type { Joke } from '../../../api/types'
import { Button } from '../../../components/ui/Button'
import { Input, Select } from '../../../components/ui/Field'
import { Modal } from '../../../components/ui/Modal'
import { topicName } from '../../../lib/jokeMeta'
import { toInput } from '../useAutosaveJoke'
import { matchesSearch } from '../useJokeFilters'
import { clusterName, versionsOf } from './lead'

const ANY = ''

interface Props {
  clusterId: string
  /** Its lead, whose topic and subtopic come first. */
  lead?: Joke
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddVersionsDialog({ clusterId, lead, open, onOpenChange }: Props) {
  const { data: jokes = [] } = useJokes()
  const { data: topics = [] } = useTopics()
  const { data: clusters = [] } = useClusters()
  const save = useSaveJoke()
  const [q, setQ] = useState('')
  const [topic, setTopic] = useState(ANY)
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const near = (j: Joke) => (lead && j.subtopic_id && j.subtopic_id === lead.subtopic_id ? 0 : j.topic_id === lead?.topic_id ? 1 : 2)
  const shown = jokes
    .filter((j) => j.cluster_id !== clusterId && (topic === ANY || j.topic_id === topic) && matchesSearch(j, q))
    .sort((a, b) => near(a) - near(b) || b.updated_at.localeCompare(a.updated_at))
  const otherCluster = (id: string) => clusterName(clusters.find((c) => c.id === id), versionsOf(id, jokes))

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
    for (const j of jokes) if (ticked.has(j.id)) save.mutate({ id: j.id, input: { ...toInput(j), cluster_id: clusterId } })
    close()
  }

  return (
    <Modal open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())} title="Add jokes you've written" description="Versions of the same joke, from any topic." wide
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
                {j.punchline && <span className="mt-0.5 line-clamp-1 text-[15px] text-dim">{j.punchline}</span>}
                {j.cluster_id && <span className="mt-0.5 line-clamp-1 text-xs text-faint">In “{otherCluster(j.cluster_id)}”: moves here</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
