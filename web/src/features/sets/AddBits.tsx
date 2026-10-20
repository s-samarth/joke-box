/** Pick bits for a set: search, filter by topic and type, tap + (or drag on desktop). */
import { useDraggable } from '@dnd-kit/core'
import { Check, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useBits, useTopics } from '../../api/library'
import type { Bit } from '../../api/types'
import { StrengthTicks } from '../../components/ui/bits'
import { Input, Select } from '../../components/ui/Field'
import { UNDEFINED_TYPE, topicName } from '../../lib/bitMeta'
import { clock } from '../../lib/duration'
import { matchesSearch, matchesType } from '../bits/useBitFilters'

function Candidate({ bit, used, onAdd, draggable }: { bit: Bit; used: boolean; onAdd: () => void; draggable: boolean }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `lib:${bit.id}`, disabled: used || !draggable })
  return (
    <li ref={setNodeRef} {...(draggable ? { ...listeners, ...attributes } : {})} className={`flex items-center gap-3 py-2.5 ${used ? 'opacity-40' : draggable ? 'cursor-grab' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 leading-snug">{bit.setup}</p>
        <p className="mt-1 flex items-center gap-3 text-[13px] text-faint"><StrengthTicks strength={bit.strength} /><span className="tabular">{clock(bit.duration_seconds)}</span></p>
      </div>
      <button type="button" onClick={onAdd} disabled={used} aria-label={used ? 'Already in the set' : 'Add to set'} onPointerDown={(e) => e.stopPropagation()}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink-3 text-tape hover:bg-ink-4 disabled:bg-transparent disabled:text-faint">
        {used ? <Check size={18} /> : <Plus size={20} />}
      </button>
    </li>
  )
}

export function AddBits({ used, onAdd, draggable = false }: { used: Set<string>; onAdd: (b: Bit) => void; draggable?: boolean }) {
  const { data: bits = [] } = useBits()
  const { data: topics = [] } = useTopics()
  const [q, setQ] = useState('')
  const [topic, setTopic] = useState('')
  const [type, setType] = useState('')
  const types = useMemo(() => [...new Set(bits.flatMap((b) => b.types))].sort(), [bits])
  const shown = bits
    .filter((b) => (!topic || b.topic_id === topic) && matchesType(b, type || null) && matchesSearch(b, q))
    .sort((a, b) => b.strength - a.strength)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
        <Input type="search" aria-label="Search bits" placeholder="Search bits" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select aria-label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">All topics</option>
          {topics.map((t) => <option key={t.id} value={t.id}>{topicName(t)}</option>)}
        </Select>
        <Select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
          <option value={UNDEFINED_TYPE}>No type yet</option>
        </Select>
      </div>
      <p className="text-sm text-faint">Strongest first{draggable ? '. Drag onto the set or tap +.' : '.'}</p>
      <ul className="min-h-0 flex-1 divide-y divide-rule overflow-y-auto">
        {shown.length === 0 && <li className="py-6 text-dim">No bits match.</li>}
        {shown.map((b) => <Candidate key={b.id} bit={b} used={used.has(b.id)} onAdd={() => onAdd(b)} draggable={draggable} />)}
      </ul>
    </div>
  )
}
