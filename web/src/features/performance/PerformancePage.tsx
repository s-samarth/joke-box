/** Performance: stats, filters, the log table, CSV export and the Log New Mic form. */
import { ChevronLeft, ChevronRight, Download, Mic, Plus, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTopics } from '../../api/library'
import { useLogActions, useLogs } from '../../api/shows'
import type { PerformanceLog } from '../../api/types'
import { Button, IconButton } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/bits'
import { useFeedback } from '../../components/ui/feedbackContext'
import { Modal } from '../../components/ui/Modal'
import { downloadCsv } from '../../lib/csv'
import { long } from '../../lib/duration'
import { formatDateTime } from '../../lib/time'
import { FilterPanel } from './FilterPanel'
import { LogForm } from './LogForm'
import { LogTable } from './LogTable'
import { NO_FILTERS, PAGE_SIZE, applyFilters, sortLogs, stats, type SortKey } from './logMath'
import { StatsCards } from './StatsCards'

export function PerformancePage() {
  const { data: logs = [] } = useLogs()
  const { data: topics = [] } = useTopics()
  const { remove } = useLogActions()
  const { confirm, toast } = useFeedback()
  const [filters, setFilters] = useState(NO_FILTERS)
  const [showFilters, setShowFilters] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'date', desc: true })
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<PerformanceLog | 'new' | null>(null)
  const [viewing, setViewing] = useState<PerformanceLog | null>(null)

  const filtered = useMemo(() => sortLogs(applyFilters(logs, filters), sort.key, sort.desc), [logs, filters, sort])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const shown = filtered.slice((Math.min(page, pages) - 1) * PAGE_SIZE, Math.min(page, pages) * PAGE_SIZE)
  const venues = [...new Set(logs.map((l) => l.venue_name))].sort()
  const topicNames = (ids: string[]) => ids.map((id) => topics.find((t) => t.id === id)?.name).filter(Boolean).join(', ')

  const onSort = (key: SortKey) => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))
  const onDelete = async (log: PerformanceLog) => {
    if (await confirm({ title: 'Delete this log?', message: `${log.venue_name}, ${formatDateTime(log.performed_at)}`, confirmLabel: 'Delete', danger: true })) {
      remove.mutate(log.id, { onSuccess: () => toast('Log deleted') })
      setViewing(null)
    }
  }
  const exportCsv = () =>
    downloadCsv('performance_logs.csv', ['Date', 'Venue', 'Duration', 'Audience', 'Rating', 'Set Topics', 'Comments'],
      filtered.map((l) => [formatDateTime(l.performed_at), l.venue_name, long(l.duration_seconds), l.audience_size, l.rating, topicNames(l.topic_ids), l.notes]))

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 pt-5 sm:px-6 lg:pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">Performance</h1>
        <div className="flex gap-2">
          <Button variant="ghost" icon={<SlidersHorizontal size={16} />} onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>Filters</Button>
          <Button variant="ghost" icon={<Download size={16} />} onClick={exportCsv} disabled={!filtered.length}><span className="hidden sm:inline">Export CSV</span></Button>
          <Button variant="primary" icon={<Plus size={18} />} onClick={() => setEditing('new')}>Log mic</Button>
        </div>
      </div>
      <StatsCards s={stats(filtered)} />
      {showFilters && <FilterPanel venues={venues} value={filters} onChange={(f) => { setFilters(f); setPage(1) }} />}
      {filtered.length === 0 ? (
        <EmptyState icon={<Mic size={24} />} title={logs.length ? 'No logs match' : 'No mics logged yet'}>
          {logs.length ? 'Try clearing a filter.' : 'After your next set, tap “Log mic”. It takes under a minute.'}
        </EmptyState>
      ) : (
        <>
          <LogTable logs={shown} sort={sort} onSort={onSort} onView={setViewing} onEdit={setEditing} onDelete={onDelete} />
          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 text-sm text-muted">
              <IconButton label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={18} /></IconButton>
              <span className="tabular">Page {Math.min(page, pages)} of {pages}</span>
              <IconButton label="Next page" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={18} /></IconButton>
            </div>
          )}
        </>
      )}
      {editing && <LogForm log={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {viewing && (
        <Modal open onOpenChange={(o) => !o && setViewing(null)} title={viewing.venue_name} description={formatDateTime(viewing.performed_at)}
          footer={<><Button variant="danger" className="mr-auto" onClick={() => onDelete(viewing)}>Delete</Button><Button variant="primary" onClick={() => { setEditing(viewing); setViewing(null) }}>Edit</Button></>}>
          <dl className="divide-y divide-line rounded-2xl bg-ink/60 px-4 text-sm ring-1 ring-line">
            {[['Duration', long(viewing.duration_seconds)], ['Audience', `${viewing.audience_size} people`], ['Rating', `${'★'.repeat(viewing.rating)}${'☆'.repeat(5 - viewing.rating)}`], ['Topics', topicNames(viewing.topic_ids) || '—']].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-muted">{k}</dt><dd className="text-right">{v}</dd></div>
            ))}
          </dl>
          {viewing.notes && <p className="mt-4 text-sm whitespace-pre-wrap text-muted">{viewing.notes}</p>}
        </Modal>
      )}
    </div>
  )
}
