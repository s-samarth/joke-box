/**
 * Shows: pick a period and venue, read the totals, then every show in a sortable table, on a
 * timeline, or broken down into strengths and weak spots. One set of filters drives all of it, so
 * the numbers always match the rows.
 */
import { Download, MapPin, MoreHorizontal, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useTopics } from '../../api/library'
import { useLogs } from '../../api/shows'
import type { PerformanceLog } from '../../api/types'
import { Button, IconButton } from '../../components/ui/Button'
import { EmptyState, PageHead } from '../../components/ui/pieces'
import { Dropdown } from '../../components/ui/Menu'
import { topicName } from '../../lib/jokeMeta'
import { downloadCsv } from '../../lib/csv'
import { long } from '../../lib/duration'
import { formatDateTime, todayIst } from '../../lib/time'
import { InsightsView } from './insights/InsightsView'
import { TimelineView } from './insights/TimelineView'
import { LogShowSheet } from './LogShowSheet'
import { NO_FILTERS, PAGE_SIZE, applyFilters, sortLogs, type Sort, type SortKey } from './logMath'
import { ShowDetail } from './ShowDetail'
import { ShowFilters } from './ShowFilters'
import { ShowStats } from './ShowStats'
import { ShowsTable } from './ShowsTable'
import { ShowsToolbar } from './ShowsToolbar'
import { VenuesSheet } from './VenuesSheet'
import { ViewTabs, type View } from './ViewTabs'

export function ShowsPage() {
  const { data: logs = [] } = useLogs()
  const { data: topics = [] } = useTopics()
  const [params, setParams] = useSearchParams()
  const [today] = useState(todayIst)
  const [filters, setFilters] = useState(NO_FILTERS)
  const [moreOpen, setMoreOpen] = useState(false)
  const [sort, setSort] = useState<Sort>({ key: 'date', desc: true })
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [editingRow, setEditing] = useState<PerformanceLog | 'new' | null>(null)
  // ?log=1 (the + button, or a link) opens a blank log sheet.
  const editing = editingRow ?? (params.get('log') ? 'new' : null)
  const [viewing, setViewing] = useState<PerformanceLog | null>(null)
  const [venuesOpen, setVenuesOpen] = useState(false)
  const view: View = params.get('view') === 'timeline' || params.get('view') === 'insights' ? (params.get('view') as View) : 'list'

  const filtered = useMemo(() => applyFilters(logs, filters, today), [logs, filters, today])
  const rows = useMemo(() => sortLogs(filtered, sort), [filtered, sort])
  const venues = useMemo(() => [...new Set(logs.map((l) => l.venue_name))].sort(), [logs])
  const topicNames = (ids: string[]) => ids.map((id) => topicName(topics.find((t) => t.id === id))).filter(Boolean).join(', ')

  const changeFilters = (f: typeof filters) => {
    setFilters(f)
    setLimit(PAGE_SIZE)
  }
  // A new column sorts high-to-low first (newest, longest, best), except venue, which goes A to Z.
  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key !== 'venue' }))
  const closeEditor = () => {
    setEditing(null)
    if (params.get('log')) setParams((p) => { p.delete('log'); return p }, { replace: true })
  }
  const changeView = (v: View) => setParams((p) => { if (v === 'list') p.delete('view'); else p.set('view', v); return p }, { replace: true })
  const exportCsv = () =>
    downloadCsv('jokebox-shows.csv', ['Date', 'Venue', 'Duration', 'Audience', 'Rating', 'Set Topics', 'Comments'],
      rows.map((l) => [formatDateTime(l.performed_at), l.venue_name, long(l.duration_seconds), l.audience_size, l.rating, topicNames(l.topic_ids), l.notes]))

  return (
    <div className="mx-auto max-w-5xl">
      <PageHead title="Shows">
        <Dropdown items={[{ label: 'Venues', icon: <MapPin size={16} />, onSelect: () => setVenuesOpen(true) }, { label: 'Export as CSV', icon: <Download size={16} />, onSelect: exportCsv, disabled: !rows.length }]} trigger={<IconButton label="More"><MoreHorizontal size={20} /></IconButton>} />
        <Button variant="tape" icon={<Plus size={18} />} onClick={() => setEditing('new')}>Log a show</Button>
      </PageHead>

      <div className="mb-4"><ViewTabs value={view} onChange={changeView} /></div>
      <div className="mb-5"><ShowsToolbar value={filters} onChange={changeFilters} venues={venues} onMore={() => setMoreOpen(true)} /></div>
      <ShowStats logs={filtered} />

      {view === 'timeline' && <div className="mt-8"><TimelineView logs={filtered} /></div>}
      {view === 'insights' && <div className="mt-8"><InsightsView logs={filtered} topics={topics} /></div>}
      {view === 'list' && <section className="mt-10">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Every show</h2>
          <span className="text-sm text-faint">{rows.length} of {logs.length}</span>
        </div>
        {rows.length === 0 ? (
          <EmptyState title={logs.length ? 'No shows match' : 'No shows yet'}>{logs.length ? 'Try a longer period or clear a filter.' : 'After your next spot, log it here. It takes under a minute.'}</EmptyState>
        ) : (
          <>
            <ShowsTable logs={rows.slice(0, limit)} sort={sort} onSort={sortBy} onOpen={setViewing} topicNames={topicNames} />
            {rows.length > limit && <Button className="mt-4 w-full" onClick={() => setLimit((n) => n + PAGE_SIZE)}>Show {Math.min(PAGE_SIZE, rows.length - limit)} more</Button>}
          </>
        )}
      </section>}

      {venuesOpen && <VenuesSheet onClose={() => setVenuesOpen(false)} />}
      <ShowFilters open={moreOpen} onClose={() => setMoreOpen(false)} value={filters} onChange={changeFilters} />
      {editing && <LogShowSheet log={editing === 'new' ? undefined : editing} onClose={closeEditor} />}
      {viewing && <ShowDetail log={viewing} topics={topicNames(viewing.topic_ids)} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null) }} />}
    </div>
  )
}
