/**
 * Bits: a scannable list. On desktop the selected bit opens beside the list (like a mail app);
 * on a phone it opens as its own page.
 */
import { Download, MoreHorizontal } from 'lucide-react'
import { Link, Outlet, useParams } from 'react-router'
import { useTopics } from '../../api/library'
import type { Bit, Topic } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { EmptyState, PageHead, Spinner, StrengthTicks, TypeLabel } from '../../components/ui/bits'
import { Dropdown } from '../../components/ui/Menu'
import { CLEAN_LABELS, topicName } from '../../lib/bitMeta'
import { downloadCsv } from '../../lib/csv'
import { clock, long } from '../../lib/duration'
import { formatDateTime, todayIst } from '../../lib/time'
import { useCapture } from '../capture/captureContext'
import { BitFilters } from './BitFilters'
import { useBitFilters } from './useBitFilters'

function exportCsv(bits: Bit[], topics: Topic[]) {
  const topicOf = (b: Bit) => topics.find((t) => t.id === b.topic_id)
  const headers = ['Setup', 'Punchline', 'Type', 'Topic', 'Subtopic', 'Rating', 'Status', 'Duration', 'Tags', 'Comments', 'Created At', 'Tag Lines', 'Clean', 'Language']
  const rows = bits.map((b) => [
    b.setup, b.punchline, b.types.join('; '), topicName(topicOf(b)), topicOf(b)?.subtopics.find((s) => s.id === b.subtopic_id)?.name ?? '',
    b.strength, b.status ?? '', long(b.duration_seconds), b.hashtags.join(' '), b.comments, formatDateTime(b.created_at),
    b.tag_lines.join(' | '), b.clean_rating ? CLEAN_LABELS[b.clean_rating] : '', b.language ?? '',
  ])
  downloadCsv(`jokebox-jokes-${todayIst()}.csv`, headers, rows)
}

function BitRow({ bit, topic, active, query }: { bit: Bit; topic?: Topic; active: boolean; query: string }) {
  return (
    <li>
      <Link to={`/bits/${bit.id}${query ? `?${query}` : ''}`} aria-current={active ? 'page' : undefined}
        className={`block border-l-2 py-3.5 pr-2 pl-3 transition-colors ${active ? 'border-tape bg-ink-2' : 'border-transparent hover:bg-ink-2/60'}`}>
        <p className="line-clamp-2 leading-snug">{bit.setup}</p>
        {bit.punchline && <p className="mt-1 line-clamp-1 text-[15px] text-dim">{bit.punchline}</p>}
        <div className="mt-2 flex items-center gap-x-3 gap-y-1 text-[13px] text-faint">
          <StrengthTicks strength={bit.strength} />
          {bit.types.slice(0, 2).map((t) => <TypeLabel key={t} name={t} />)}
          <span className="truncate">{topicName(topic)}</span>
          {bit.duration_seconds > 0 && <span className="ml-auto tabular">{clock(bit.duration_seconds)}</span>}
        </div>
      </Link>
    </li>
  )
}

export function BitsLayout() {
  const { bitId } = useParams()
  const f = useBitFilters()
  const { data: topics = [] } = useTopics()
  const { openCapture } = useCapture()

  return (
    <div className="lg:-mx-10 lg:flex lg:h-dvh">
      <section className={`lg:flex lg:w-[26rem] lg:shrink-0 lg:flex-col lg:border-r lg:border-rule lg:px-6 ${bitId ? 'hidden lg:flex' : ''}`}>
        <PageHead title="Jokes">
          <Dropdown items={[{ label: 'Export as CSV', icon: <Download size={16} />, onSelect: () => exportCsv(f.visible, topics), disabled: !f.visible.length }]}
            trigger={<IconButton label="More"><MoreHorizontal size={20} /></IconButton>} />
        </PageHead>
        <BitFilters f={f} />
        <p className="mt-4 mb-1 text-sm text-faint">{f.active ? `${f.visible.length} of ${f.total} jokes` : `${f.total} jokes`}</p>
        <div className="lg:-mx-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-3">
          {f.isPending ? (
            <div className="py-10"><Spinner /></div>
          ) : f.visible.length === 0 ? (
            <EmptyState title={f.active ? 'Nothing matches' : 'No jokes yet'}
              action={!f.active && <button type="button" onClick={() => openCapture({ topicId: f.topic ?? undefined, subtopicId: f.sub })} className="text-tape underline-offset-4 hover:underline">Capture your first joke</button>}>
              {f.active ? 'Try another word or clear the filters.' : 'Tap + whenever a premise hits you.'}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-rule pb-6">
              {f.visible.map((b) => <BitRow key={b.id} bit={b} topic={topics.find((t) => t.id === b.topic_id)} active={b.id === bitId} query={f.query} />)}
            </ul>
          )}
        </div>
      </section>
      <section className={`min-w-0 flex-1 lg:overflow-y-auto lg:px-10 ${bitId ? '' : 'hidden lg:block'}`}>
        <Outlet />
      </section>
    </div>
  )
}

export function NoBitSelected() {
  return (
    <div className="flex h-full items-center">
      <EmptyState title="Pick a joke">Choose one from the list to read it, rework it or start a rewrite.</EmptyState>
    </div>
  )
}
