/** Pick a bit to work on: topics as collapsible folders listing their bits. */
import { ChevronRight, Folder } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useBits, useTopics } from '../../api/library'

export function BitPicker({ activeId }: { activeId?: string }) {
  const { data: topics = [] } = useTopics()
  const { data: bits = [] } = useBits()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const activeTopic = bits.find((b) => b.id === activeId)?.topic_id

  return (
    <nav aria-label="Bits by topic" className="space-y-1">
      {topics.map((t) => {
        const inTopic = bits.filter((b) => b.topic_id === t.id)
        const expanded = open[t.id] ?? t.id === activeTopic
        return (
          <div key={t.id}>
            <button type="button" onClick={() => setOpen((o) => ({ ...o, [t.id]: !expanded }))} className="flex h-10 w-full items-center gap-2 rounded-xl px-2 text-sm text-muted hover:bg-white/5 hover:text-text">
              <ChevronRight size={14} className={expanded ? 'rotate-90 transition' : 'transition'} />
              <Folder size={16} />
              <span className="flex-1 truncate text-left">{t.name}</span>
              <span className="text-xs tabular text-faint">{inTopic.length}</span>
            </button>
            {expanded && (
              <ul className="mt-0.5 mb-2 space-y-0.5 pl-6">
                {inTopic.length === 0 && <li className="px-3 py-2 text-xs text-faint">No bits</li>}
                {inTopic.map((b) => (
                  <li key={b.id}>
                    <Link to={`/studio/${b.id}`} className={`block rounded-xl px-3 py-2 text-sm leading-snug ${b.id === activeId ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-white/5 hover:text-text'}`}>
                      <span className="line-clamp-2">{b.setup}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </nav>
  )
}
