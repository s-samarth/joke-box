/**
 * Your topics as folders on the home screen: tap a folder to open its jokes, or a subtopic
 * inside it to go one level deeper. Counts are live, worked out from the jokes you have.
 */
import { Folder } from 'lucide-react'
import { Link } from 'react-router'
import { useBits, useTopics } from '../../api/library'
import type { Topic } from '../../api/types'
import { SectionHead } from '../../components/ui/bits'
import { topicName } from '../../lib/bitMeta'

const MAX_SUBS = 3

function FolderCard({ topic, count, subCount }: { topic: Topic; count: number; subCount: (id: string) => number }) {
  const subs = topic.subtopics.slice(0, MAX_SUBS)
  const more = topic.subtopics.length - subs.length
  return (
    <li className="group relative mt-[18px]">
      {/* The folder tab, sitting on top of the card like a manila folder, with the count on it. */}
      <span aria-hidden className="absolute -top-[18px] left-3 flex h-[18px] min-w-12 items-center justify-center rounded-t-md bg-ink-3 px-2 text-xs text-dim tabular ring-1 ring-rule transition-colors group-hover:bg-ink-4">{count}</span>
      <div className="relative h-full rounded-xl rounded-tl-sm bg-ink-2 p-4 ring-1 ring-rule transition-colors group-hover:bg-ink-3">
        {/* Stretched link: its ::after covers the whole card, so the card is one big tap target,
            while the subtopic links below sit above it (relative z-10) and stay tappable. */}
        <Link to={`/bits?topic=${topic.id}`} className="flex items-start gap-2 after:absolute after:inset-0 after:rounded-xl after:content-['']">
          <Folder size={18} className="mt-0.5 shrink-0 text-tape" aria-hidden />
          <span className="min-w-0 flex-1 leading-snug font-medium break-words">{topicName(topic)}</span>
          <span className="sr-only">, {count}</span>
        </Link>
        {subs.length > 0 && (
          <ul className="relative z-10 mt-2.5 space-y-0.5">
            {subs.map((s) => (
              <li key={s.id}>
                <Link to={`/bits?topic=${topic.id}&sub=${s.id}`} className="-mx-1.5 flex items-baseline gap-2 rounded px-1.5 py-1 text-sm text-dim hover:bg-ink-4 hover:text-paper">
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  <span className="text-faint tabular">{subCount(s.id)}</span>
                </Link>
              </li>
            ))}
            {more > 0 && <li className="px-0 pt-0.5 text-sm text-faint">and {more} more</li>}
          </ul>
        )}
      </div>
    </li>
  )
}

export function TopicFolders() {
  const { data: topics = [] } = useTopics()
  const { data: bits = [] } = useBits()
  const counts = new Map<string, number>()
  for (const b of bits) {
    counts.set(b.topic_id, (counts.get(b.topic_id) ?? 0) + 1)
    if (b.subtopic_id) counts.set(b.subtopic_id, (counts.get(b.subtopic_id) ?? 0) + 1)
  }
  const count = (id: string) => counts.get(id) ?? 0
  // Inbox first (it's where new jokes land), then your topics in their saved order.
  const ordered = [...topics.filter((t) => t.is_system), ...topics.filter((t) => !t.is_system)]
  if (!ordered.length) return null

  return (
    <section className="mt-12">
      <SectionHead title="Topics">
        <Link to="/bits" className="text-sm text-dim hover:text-paper">All {bits.length}</Link>
      </SectionHead>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ordered.map((t) => <FolderCard key={t.id} topic={t} count={count(t.id)} subCount={count} />)}
      </ul>
    </section>
  )
}
