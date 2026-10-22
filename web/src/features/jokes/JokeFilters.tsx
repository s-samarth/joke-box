/** Search plus four menus: topic, type, status and sort. Each menu shows what's chosen. */
import { ChevronDown, Search, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useStatuses, useTopics, useTypes } from '../../api/library'
import { Input } from '../../components/ui/Field'
import { Dropdown, type MenuItem } from '../../components/ui/Menu'
import { UNDEFINED_TYPE, topicName } from '../../lib/jokeMeta'
import { TopicManager } from './TopicManager'
import { TypeManager } from './TypeManager'
import { SORTS, type SortKey, type useJokeFilters } from './useJokeFilters'

type Filters = ReturnType<typeof useJokeFilters>

function MenuButton({ label, on, children }: { label: string; on: boolean; children?: ReactNode }) {
  return (
    <button type="button" className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm transition ${on ? 'bg-paper text-ink font-medium' : 'bg-ink-3 text-dim hover:text-paper'}`}>
      {label}
      {children ?? <ChevronDown size={14} />}
    </button>
  )
}

export function JokeFilters({ f }: { f: Filters }) {
  const { data: topics = [] } = useTopics()
  const { data: types = [] } = useTypes()
  const { data: statuses = [] } = useStatuses()
  const [managing, setManaging] = useState<'topics' | 'types' | null>(null)
  const topic = topics.find((t) => t.id === f.topic)
  const sub = topic?.subtopics.find((s) => s.id === f.sub)

  const topicItems: (MenuItem | 'divider')[] = [
    { label: 'All topics', onSelect: () => f.set({ topic: null, sub: null }), checked: !f.topic },
    ...topics.flatMap((t) => [
      { label: topicName(t), onSelect: () => f.set({ topic: t.id, sub: null }), checked: f.topic === t.id && !f.sub },
      ...t.subtopics.map((s) => ({ label: `   ${s.name}`, onSelect: () => f.set({ topic: t.id, sub: s.id }), checked: f.sub === s.id })),
    ]),
    'divider',
    { label: 'Manage topics…', onSelect: () => setManaging('topics') },
  ]
  const typeItems: (MenuItem | 'divider')[] = [
    { label: 'All types', onSelect: () => f.set({ type: null }), checked: !f.type },
    ...types.map((t) => ({ label: t.name, onSelect: () => f.set({ type: t.name }), checked: f.type === t.name })),
    { label: 'No type yet', onSelect: () => f.set({ type: UNDEFINED_TYPE }), checked: f.type === UNDEFINED_TYPE },
    'divider',
    { label: 'Manage types…', onSelect: () => setManaging('types') },
  ]
  const statusItems: MenuItem[] = [
    { label: 'Any status', onSelect: () => f.set({ status: null }), checked: !f.status },
    ...statuses.map((s) => ({ label: s.name, onSelect: () => f.set({ status: s.name }), checked: f.status === s.name })),
  ]
  const sortItems: MenuItem[] = (Object.keys(SORTS) as SortKey[]).map((k) => ({ label: SORTS[k], onSelect: () => f.set({ sort: k === 'new' ? null : k }), checked: f.sort === k }))

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
        <Input type="search" aria-label="Search jokes" placeholder="Search words, tags, notes" className="pl-10" value={f.q} onChange={(e) => f.set({ q: e.target.value })} />
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        <Dropdown align="start" items={topicItems} trigger={<span><MenuButton label={sub ? sub.name : topic ? topicName(topic) : 'Topic'} on={Boolean(topic)} /></span>} />
        <Dropdown align="start" items={typeItems} trigger={<span><MenuButton label={f.type === UNDEFINED_TYPE ? 'No type yet' : (f.type ?? 'Type')} on={Boolean(f.type)} /></span>} />
        <Dropdown align="start" items={statusItems} trigger={<span><MenuButton label={f.status ?? 'Status'} on={Boolean(f.status)} /></span>} />
        <Dropdown align="start" items={sortItems} trigger={<span><MenuButton label={SORTS[f.sort]} on={false} /></span>} />
        {f.active && (
          <button type="button" onClick={() => f.set({ topic: null, sub: null, type: null, status: null, q: null })} className="inline-flex h-9 shrink-0 items-center gap-1 px-2 text-sm text-dim hover:text-paper">
            <X size={14} /> Clear
          </button>
        )}
      </div>
      <TopicManager open={managing === 'topics'} onClose={() => setManaging(null)} />
      <TypeManager open={managing === 'types'} onClose={() => setManaging(null)} />
    </div>
  )
}
