/**
 * Pick jokes for a set: search, filter by topic, status and clean rating, tap + (or drag on desktop). Tap a joke to read it.
 * The jokes you worked on last come first, since those are usually the ones you're building the set from.
 * The search, topic, filters and sort are remembered for an hour (lib/sessionMemory), so leaving to
 * look at a joke or another screen and coming back finds the list as you left it.
 */
import { useDraggable } from '@dnd-kit/core'
import { Check, Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useJokes, useTopics } from '../../api/library'
import type { Joke } from '../../api/types'
import { StrengthTicks } from '../../components/ui/pieces'
import { Input, Select } from '../../components/ui/Field'
import { topicName } from '../../lib/jokeMeta'
import { clock } from '../../lib/duration'
import { recall, remember } from '../../lib/sessionMemory'
import { matchesSearch } from '../jokes/useJokeFilters'
import { PickFilters } from './PickFilters'
import { matchesPicks, NO_PICKS, type PickState } from './pickMatch'

// Keys pressed on a button inside a draggable row shouldn't start a keyboard drag of the row.
const SORTS = {
  edited: { label: 'Recently edited', by: (a: Joke, b: Joke) => b.updated_at.localeCompare(a.updated_at) },
  created: { label: 'Newest', by: (a: Joke, b: Joke) => b.created_at.localeCompare(a.created_at) },
  strongest: { label: 'Strongest', by: (a: Joke, b: Joke) => b.strength - a.strength },
}
type SortKey = keyof typeof SORTS

type Picker = { q: string; topic: string; picks: PickState; sort: SortKey }
const MEMORY = 'set-picker'
const FRESH: Picker = { q: '', topic: '', picks: NO_PICKS, sort: 'edited' }

const own = { onKeyDown: (e: React.KeyboardEvent) => e.stopPropagation() }

function Candidate({ joke, used, onAdd, onOpen, draggable }: { joke: Joke; used: boolean; onAdd: () => void; onOpen: () => void; draggable: boolean }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `lib:${joke.id}`, disabled: used || !draggable })
  return (
    <li ref={setNodeRef} {...(draggable ? { ...listeners, ...attributes } : {})} className={`flex items-center gap-3 py-2.5 ${used ? 'opacity-40' : draggable ? 'cursor-grab' : ''}`}>
      <button type="button" onClick={onOpen} {...own} aria-label={`Read the whole joke: ${joke.setup}`} className="min-w-0 flex-1 rounded-md text-left hover:text-tape">
        <p className="line-clamp-2 leading-snug">{joke.setup}</p>
        <p className="mt-1 flex items-center gap-3 text-[13px] text-faint"><StrengthTicks strength={joke.strength} /><span className="tabular">{clock(joke.duration_seconds)}</span></p>
      </button>
      <button type="button" onClick={onAdd} {...own} disabled={used} aria-label={used ? 'Already in the set' : 'Add to set'} onPointerDown={(e) => e.stopPropagation()}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink-3 text-tape hover:bg-ink-4 disabled:bg-transparent disabled:text-faint">
        {used ? <Check size={18} /> : <Plus size={20} />}
      </button>
    </li>
  )
}

interface Props {
  used: Set<string>
  onAdd: (b: Joke) => void
  onOpen: (b: Joke) => void
  draggable?: boolean
}

export function AddJokes({ used, onAdd, onOpen, draggable = false }: Props) {
  const { data: jokes = [] } = useJokes()
  const { data: topics = [] } = useTopics()
  const [start] = useState(() => ({ ...FRESH, ...recall<Picker>(MEMORY) }))
  const [q, setQ] = useState(start.q)
  const [topic, setTopic] = useState(start.topic)
  const [picks, setPicks] = useState<PickState>(start.picks)
  const [sort, setSort] = useState<SortKey>(start.sort in SORTS ? start.sort : 'edited')
  useEffect(() => remember<Picker>(MEMORY, { q, topic, picks, sort }), [q, topic, picks, sort])
  const shown = jokes
    .filter((b) => (!topic || b.topic_id === topic) && matchesPicks(b, picks) && matchesSearch(b, q))
    .sort(SORTS[sort].by)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
        <Input type="search" aria-label="Search jokes" placeholder="Search jokes" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select aria-label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">All topics</option>
          {topics.map((t) => <option key={t.id} value={t.id}>{topicName(t)}</option>)}
        </Select>
        <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <PickFilters value={picks} onChange={setPicks} />
      </div>
      {draggable && <p className="text-sm text-faint">Drag onto the set or tap +.</p>}
      <ul className="min-h-0 flex-1 divide-y divide-rule overflow-y-auto">
        {shown.length === 0 && <li className="py-6 text-dim">No jokes match.</li>}
        {shown.map((b) => <Candidate key={b.id} joke={b} used={used.has(b.id)} onAdd={() => onAdd(b)} onOpen={() => onOpen(b)} draggable={draggable} />)}
      </ul>
    </div>
  )
}
