/** The folder tree: All Bits, then topics with subtopics and live counts. */
import { ChevronRight, Folder, FolderPlus, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { useBits, useTopicActions, useTopics } from '../api/library'
import type { Subtopic, Topic } from '../api/types'
import { useFeedback } from '../components/ui/feedbackContext'
import { WithContextMenu, type MenuItem } from '../components/ui/Menu'

const row = 'flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm transition-colors'
const tone = (active: boolean) => (active ? 'bg-accent-soft text-accent font-medium' : 'text-muted hover:bg-white/5 hover:text-text')

export function TopicTree({ onNavigate }: { onNavigate?: () => void }) {
  const { data: topics = [] } = useTopics()
  const { data: bits = [] } = useBits()
  const [params] = useSearchParams()
  const onLibrary = useLocation().pathname === '/'
  const activeTopic = onLibrary ? params.get('topic') : null
  const activeSub = params.get('subtopic')
  const actions = useTopicActions()
  const { prompt, confirm, toast } = useFeedback()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of bits) {
      map.set(b.topic_id, (map.get(b.topic_id) ?? 0) + 1)
      if (b.subtopic_id) map.set(b.subtopic_id, (map.get(b.subtopic_id) ?? 0) + 1)
    }
    return map
  }, [bits])

  const fail = (e: Error) => toast(e.message)
  const newFolder = async () => {
    const name = await prompt({ title: 'New folder', label: 'Topic name', confirmLabel: 'Create' })
    if (name) actions.create.mutate(name, { onError: fail })
  }

  const topicMenu = (t: Topic): MenuItem[] => [
    { label: 'Add subtopic', icon: <Plus size={16} />, onSelect: async () => {
      const name = await prompt({ title: `New subtopic in ${t.name}`, label: 'Subtopic name', confirmLabel: 'Create' })
      if (name) actions.addSubtopic.mutate({ topicId: t.id, name }, { onError: fail })
    } },
    { label: 'Rename', icon: <Pencil size={16} />, disabled: t.is_system, onSelect: async () => {
      const name = await prompt({ title: 'Rename topic', initial: t.name })
      if (name && name !== t.name) actions.rename.mutate({ id: t.id, name }, { onError: fail })
    } },
    { label: 'Delete', icon: <Trash2 size={16} />, danger: true, disabled: t.is_system, onSelect: async () => {
      const ok = await confirm({ title: `Delete “${t.name}”?`, message: 'Its bits move to Random. Nothing else is lost.', confirmLabel: 'Delete', danger: true })
      if (ok) actions.remove.mutate(t.id, { onError: fail })
    } },
  ]

  const subMenu = (s: Subtopic): MenuItem[] => [
    { label: 'Rename', icon: <Pencil size={16} />, onSelect: async () => {
      const name = await prompt({ title: 'Rename subtopic', initial: s.name })
      if (name && name !== s.name) actions.renameSubtopic.mutate({ id: s.id, name }, { onError: fail })
    } },
    { label: 'Delete', icon: <Trash2 size={16} />, danger: true, onSelect: async () => {
      const ok = await confirm({ title: `Delete “${s.name}”?`, message: 'Its bits stay in the topic.', confirmLabel: 'Delete', danger: true })
      if (ok) actions.removeSubtopic.mutate(s.id, { onError: fail })
    } },
  ]

  return (
    <nav aria-label="Topics" className="space-y-0.5">
      <Link to="/" onClick={onNavigate} className={`${row} ${tone(onLibrary && !activeTopic)}`}>
        <Layers size={18} /> <span className="flex-1">All Bits</span>
        <span className="text-xs tabular text-faint">{bits.length}</span>
      </Link>
      {topics.map((t) => {
        const open = !collapsed[t.id] && t.subtopics.length > 0
        return (
          <div key={t.id}>
            <WithContextMenu items={topicMenu(t)}>
              <div className={`${row} ${tone(activeTopic === t.id && !activeSub)} pr-1`}>
                <button type="button" aria-label={open ? 'Collapse' : 'Expand'} onClick={() => setCollapsed((c) => ({ ...c, [t.id]: open }))} className={`-ml-1 inline-flex size-6 items-center justify-center rounded ${t.subtopics.length ? '' : 'invisible'}`}>
                  <ChevronRight size={14} className={open ? 'rotate-90 transition' : 'transition'} />
                </button>
                <Link to={`/?topic=${t.id}`} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2">
                  <Folder size={16} className="shrink-0" /> <span className="truncate">{t.name}</span>
                </Link>
                <span className="px-2 text-xs tabular text-faint">{counts.get(t.id) ?? 0}</span>
              </div>
            </WithContextMenu>
            {open && t.subtopics.map((s) => (
              <WithContextMenu key={s.id} items={subMenu(s)}>
                <Link to={`/?topic=${t.id}&subtopic=${s.id}`} onClick={onNavigate} className={`${row} ${tone(activeSub === s.id)} pl-12`}>
                  <span className="flex-1 truncate">{s.name}</span>
                  <span className="text-xs tabular text-faint">{counts.get(s.id) ?? 0}</span>
                </Link>
              </WithContextMenu>
            ))}
          </div>
        )
      })}
      <button type="button" onClick={newFolder} className={`${row} text-faint hover:bg-white/5 hover:text-text`}>
        <FolderPlus size={18} /> New folder
      </button>
      <p className="px-3 pt-1 text-[11px] text-faint">Right-click or long-press a folder for options.</p>
    </nav>
  )
}
