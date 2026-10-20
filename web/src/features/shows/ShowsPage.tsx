/** Shows: a few honest numbers, then every show as a timeline grouped by month. */
import { Download, MoreHorizontal, Plus, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useTopics } from '../../api/library'
import { useLogs } from '../../api/shows'
import type { PerformanceLog } from '../../api/types'
import { Button, IconButton } from '../../components/ui/Button'
import { EmptyState, PageHead } from '../../components/ui/bits'
import { Dropdown } from '../../components/ui/Menu'
import { topicName } from '../../lib/bitMeta'
import { downloadCsv } from '../../lib/csv'
import { long } from '../../lib/duration'
import { formatDateTime } from '../../lib/time'
import { LogShowSheet } from './LogShowSheet'
import { NO_FILTERS, PAGE_SIZE, applyFilters, sortLogs, stats, type SortKey } from './logMath'
import { ShowDetail } from './ShowDetail'
import { ShowFilters } from './ShowFilters'
import { ShowTimeline } from './ShowTimeline'

const SORT_LABELS: Record<SortKey, string> = { date: 'Newest', rating: 'Best rated', duration: 'Longest', audience: 'Biggest crowd' }

export function ShowsPage() {
  const { data: logs = [] } = useLogs()
  const { data: topics = [] } = useTopics()
  const [params, setParams] = useSearchParams()
  const [filters, setFilters] = useState(NO_FILTERS)
  const [filtering, setFiltering] = useState(false)
  const [sort, setSort] = useState<SortKey>('date')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [editing, setEditing] = useState<PerformanceLog | 'new' | null>(params.get('log') ? 'new' : null)
  const [viewing, setViewing] = useState<PerformanceLog | null>(null)

  const filtered = useMemo(() => sortLogs(applyFilters(logs, filters), sort, true), [logs, filters, sort])
  const s = stats(filtered)
  const venues = [...new Set(logs.map((l) => l.venue_name))].sort()
  const filterCount = filters.venues.length + [filters.from, filters.to, filters.rating, filters.duration, filters.audience].filter((v) => v !== '' && v !== null).length
  const topicNames = (ids: string[]) => ids.map((id) => topicName(topics.find((t) => t.id === id))).filter(Boolean).join(', ')
  const closeEditor = () => {
    setEditing(null)
    if (params.get('log')) setParams({}, { replace: true })
  }
  const exportCsv = () =>
    downloadCsv('jokebox-shows.csv', ['Date', 'Venue', 'Duration', 'Audience', 'Rating', 'Set Topics', 'Comments'],
      filtered.map((l) => [formatDateTime(l.performed_at), l.venue_name, long(l.duration_seconds), l.audience_size, l.rating, topicNames(l.topic_ids), l.notes]))

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Shows">
        <Dropdown items={[{ label: 'Export as CSV', icon: <Download size={16} />, onSelect: exportCsv, disabled: !filtered.length }]} trigger={<IconButton label="More"><MoreHorizontal size={20} /></IconButton>} />
        <Button variant="tape" icon={<Plus size={18} />} onClick={() => setEditing('new')}>Log a show</Button>
      </PageHead>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-rule py-5 sm:grid-cols-4">
        {[
          ['Shows', String(s.totalSets)],
          ['On stage', long(s.stageSeconds)],
          ['Avg rating', s.rating === null ? 'None yet' : `${s.rating.toFixed(1)} of 5`],
          ['Most played', s.topVenue ?? 'None yet'],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-sm text-dim">{label}</dt>
            <dd className="headline mt-1 truncate text-[28px] tabular">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-faint">The average weights each show by its length, so a long set counts for more.</p>

      <div className="mt-6 mb-2 flex items-center gap-2">
        <Button small variant={filterCount ? 'tape' : 'plain'} icon={<SlidersHorizontal size={15} />} onClick={() => setFiltering(true)}>{filterCount ? `Filters (${filterCount})` : 'Filter'}</Button>
        <Dropdown align="start" items={(Object.keys(SORT_LABELS) as SortKey[]).map((k) => ({ label: SORT_LABELS[k], checked: sort === k, onSelect: () => setSort(k) }))}
          trigger={<span><Button small>{SORT_LABELS[sort]}</Button></span>} />
        <span className="ml-auto text-sm text-faint">{filtered.length} of {logs.length}</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={logs.length ? 'No shows match' : 'No shows yet'}>{logs.length ? 'Loosen a filter to see more.' : 'After your next spot, log it here. It takes under a minute.'}</EmptyState>
      ) : (
        <>
          <ShowTimeline logs={filtered.slice(0, limit)} grouped={sort === 'date'} onOpen={setViewing} />
          {filtered.length > limit && <Button className="mt-4 w-full" onClick={() => setLimit((n) => n + PAGE_SIZE)}>Show {Math.min(PAGE_SIZE, filtered.length - limit)} more</Button>}
        </>
      )}

      <ShowFilters open={filtering} onClose={() => setFiltering(false)} venues={venues} value={filters} onChange={(f) => { setFilters(f); setLimit(PAGE_SIZE) }} />
      {editing && <LogShowSheet log={editing === 'new' ? undefined : editing} onClose={closeEditor} />}
      {viewing && <ShowDetail log={viewing} topics={topicNames(viewing.topic_ids)} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null) }} />}
    </div>
  )
}
