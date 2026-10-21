/**
 * Bits: a scannable list. On desktop the selected bit opens beside the list (like a mail app);
 * on a phone it opens as its own page.
 */
import { Download, MoreHorizontal } from 'lucide-react'
import { Outlet, useParams } from 'react-router'
import { useTopics } from '../../api/library'
import type { Bit, Topic } from '../../api/types'
import { IconButton } from '../../components/ui/Button'
import { EmptyState, PageHead, Spinner } from '../../components/ui/bits'
import { Dropdown } from '../../components/ui/Menu'
import { CLEAN_LABELS, topicName } from '../../lib/bitMeta'
import { downloadCsv } from '../../lib/csv'
import { long } from '../../lib/duration'
import { formatDateTime, todayIst } from '../../lib/time'
import { useCapture } from '../capture/captureContext'
import { BitFilters } from './BitFilters'
import { BitList } from './BitList'
import { sortDate, useBitFilters } from './useBitFilters'

function exportCsv(bits: Bit[], topics: Topic[]) {
  const topicOf = (b: Bit) => topics.find((t) => t.id === b.topic_id)
  const headers = ['Setup', 'Punchline', 'Type', 'Topic', 'Subtopic', 'Rating', 'Status', 'Duration', 'Tags', 'Comments', 'Created At', 'Edited At', 'Tag Lines', 'Clean', 'Language']
  const rows = bits.map((b) => [
    b.setup, b.punchline, b.types.join('; '), topicName(topicOf(b)), topicOf(b)?.subtopics.find((s) => s.id === b.subtopic_id)?.name ?? '',
    b.strength, b.status ?? '', long(b.duration_seconds), b.hashtags.join(' '), b.comments, formatDateTime(b.created_at), formatDateTime(b.updated_at),
    b.tag_lines.join(' | '), b.clean_rating ? CLEAN_LABELS[b.clean_rating] : '', b.language ?? '',
  ])
  downloadCsv(`jokebox-jokes-${todayIst()}.csv`, headers, rows)
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
        {/* Relative, so the time scrubber can sit down the side of the list without scrolling with it. */}
        <div className="lg:relative lg:-mx-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        {/* Sorted by date, the time scrubber stands in for the scrollbar. */}
        <div className={`lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-3 ${sortDate(f.sort) ? 'no-scrollbar' : ''}`}>
          {f.isPending ? (
            <div className="py-10"><Spinner /></div>
          ) : f.visible.length === 0 ? (
            <EmptyState title={f.active ? 'Nothing matches' : 'No jokes yet'}
              action={!f.active && <button type="button" onClick={() => openCapture({ topicId: f.topic ?? undefined, subtopicId: f.sub })} className="text-tape underline-offset-4 hover:underline">Capture your first joke</button>}>
              {f.active ? 'Try another word or clear the filters.' : 'Tap + whenever a premise hits you.'}
            </EmptyState>
          ) : (
            <BitList bits={f.visible} topics={topics} sort={f.sort} activeId={bitId} query={f.query} />
          )}
        </div>
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
