/** Bits to add: search, folder and type filters. Bits already in the set are dimmed. */
import { useDraggable } from '@dnd-kit/core'
import { Check, GripVertical, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useBits, useTopics } from '../../api/library'
import type { Bit } from '../../api/types'
import { Flames } from '../../components/ui/bits'
import { Input, Select } from '../../components/ui/Field'
import { UNDEFINED_TYPE } from '../../lib/bitMeta'
import { clock } from '../../lib/duration'
import { ALL, matchesSearch, matchesType } from '../library/useLibraryView'

function LibraryItem({ bit, inSet, onAdd }: { bit: Bit; inSet: boolean; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `lib:${bit.id}`, disabled: inSet })
  return (
    <li ref={setNodeRef} className={`flex items-center gap-1 rounded-xl ring-1 ring-line ${inSet ? 'opacity-40' : 'bg-panel'} ${isDragging ? 'opacity-50' : ''}`}>
      <span {...listeners} {...attributes} aria-label="Drag into set" className={`hidden h-full cursor-grab touch-none items-center px-1.5 text-faint sm:flex ${inSet ? 'invisible' : ''}`}>
        <GripVertical size={16} />
      </span>
      <div className="min-w-0 flex-1 py-2.5 pl-3 sm:pl-0">
        <p className="line-clamp-2 text-sm leading-snug">{bit.setup}</p>
        <p className="mt-1 flex items-center gap-2 text-xs text-faint"><Flames strength={bit.strength} size={10} /><span className="tabular">{clock(bit.duration_seconds)}</span></p>
      </div>
      <button type="button" onClick={onAdd} disabled={inSet} aria-label={inSet ? 'Already in set' : 'Add to set'} className="mr-1 inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-accent hover:bg-accent-soft disabled:text-faint">
        {inSet ? <Check size={18} /> : <Plus size={20} />}
      </button>
    </li>
  )
}

export function LibraryPanel({ inSet, onAdd }: { inSet: Set<string>; onAdd: (bit: Bit) => void }) {
  const { data: bits = [] } = useBits()
  const { data: topics = [] } = useTopics()
  const [q, setQ] = useState('')
  const [topicId, setTopicId] = useState(ALL)
  const [type, setType] = useState(ALL)
  const types = useMemo(() => [...new Set(bits.flatMap((b) => b.types))].sort(), [bits])
  const shown = bits.filter((b) => (topicId === ALL || b.topic_id === topicId) && matchesType(b, type) && matchesSearch(b, q))

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
        <Input type="search" aria-label="Search bits" placeholder="Search bits…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select aria-label="Folder" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
          <option value={ALL}>All folders</option>
          {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        <Select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value={ALL}>All types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
          <option value={UNDEFINED_TYPE}>Undefined</option>
        </Select>
      </div>
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-2">
        {shown.length === 0 && <li className="py-8 text-center text-sm text-faint">No bits match.</li>}
        {shown.map((b) => <LibraryItem key={b.id} bit={b} inSet={inSet.has(b.id)} onAdd={() => onAdd(b)} />)}
      </ul>
    </div>
  )
}
