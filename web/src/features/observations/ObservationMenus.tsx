/**
 * The Topic and Kind menus an observation is filed and filtered with. Picking, they set one
 * observation's topic or kind and end in New topic / New kind; no topic picked means Random,
 * where the server files it. Filtering (`counts`), they add "All" and show how many observations
 * each holds, so an empty topic is easy to skip.
 */
import { ChevronDown, Plus } from 'lucide-react'
import { useTopics } from '../../api/library'
import { useObservationKinds } from '../../api/notebook'
import { Dropdown, type MenuItem } from '../../components/ui/Menu'
import { randomTopicId, topicName } from '../../lib/jokeMeta'
import { useNewTopic } from '../jokes/useNewTopic'
import { PLAIN, PLAIN_KIND, kindLabel, topicLabel } from './observationMeta'
import { useNewKind } from './useNewKind'

interface Props {
  /** An id, PLAIN_KIND, or null: "All" when filtering; Random (topic) or plain (kind) when picking. */
  value: string | null
  onChange: (value: string | null) => void
  /** Filtering: how many observations each choice holds. */
  counts?: (value: string | null) => number
  /** Managing kinds, from the Kind menu. */
  onManage?: () => void
}

/** Shows what's chosen; a long topic name is cut short so a phone row still fits. */
function Trigger({ name, label, on }: { name: string; label: string; on: boolean }) {
  return (
    <button type="button" aria-label={label === name ? `${name}: all` : `${name}: ${label}`} className={`inline-flex h-9 max-w-full min-w-0 items-center gap-1 rounded-lg px-2.5 text-sm sm:gap-1.5 sm:px-3 transition ${on ? 'bg-paper font-medium text-ink' : 'bg-ink-3 text-dim hover:text-paper'}`}>
      <span className="truncate">{label}</span>
      <ChevronDown size={14} className="shrink-0" />
    </button>
  )
}

export function TopicMenu({ value, onChange, counts }: Props) {
  const { data: topics = [] } = useTopics()
  const newTopic = useNewTopic()
  const picked = counts ? value : (value ?? randomTopicId(topics) ?? null)
  const label = topicLabel(topics, picked) ?? (counts ? 'Topic' : 'Random')
  const items: (MenuItem | 'divider')[] = [
    { label: 'New topic', icon: <Plus size={16} className="text-tape" />, onSelect: () => void newTopic().then((t) => t && onChange(t.id)) },
    'divider',
    ...(counts ? [{ label: 'All topics', onSelect: () => onChange(null), checked: value === null }] : []),
    ...topics.map((t) => ({ label: topicName(t), count: counts?.(t.id), onSelect: () => onChange(t.id), checked: picked === t.id })),
  ]
  return <Dropdown align="start" items={items} trigger={<span className="flex min-w-0"><Trigger name="Topic" label={label} on={picked !== null} /></span>} />
}

export function KindMenu({ value, onChange, counts, onManage }: Props) {
  const { data: kinds = [] } = useObservationKinds()
  const newKind = useNewKind()
  const plain = counts ? PLAIN_KIND : null
  const label = value === PLAIN_KIND ? PLAIN : value === null && counts ? 'Kind' : kindLabel(kinds, value)
  const items: (MenuItem | 'divider')[] = [
    { label: 'New kind', icon: <Plus size={16} className="text-tape" />, onSelect: () => void newKind().then((id) => id && onChange(id)) },
    'divider',
    ...(counts ? [{ label: 'All kinds', onSelect: () => onChange(null), checked: value === null }] : []),
    { label: PLAIN, count: counts?.(plain), onSelect: () => onChange(plain), checked: value === plain },
    ...kinds.map((k) => ({ label: k.name, count: counts?.(k.id), onSelect: () => onChange(k.id), checked: value === k.id })),
    ...(onManage ? ['divider' as const, { label: 'Manage kinds…', onSelect: onManage }] : []),
  ]
  return <Dropdown align="start" items={items} trigger={<span className="flex max-w-[60%] min-w-0 shrink-0"><Trigger name="Kind" label={label} on={value !== null} /></span>} />
}
