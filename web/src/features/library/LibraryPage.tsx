/** The bits feed: breadcrumbs, search, type pills, CSV export and a masonry grid. */
import { Download, Layers, Plus, Search } from 'lucide-react'
import { Link } from 'react-router'
import { useStatuses } from '../../api/library'
import type { Bit, Topic } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { EmptyState, Spinner } from '../../components/ui/bits'
import { Input } from '../../components/ui/Field'
import { CLEAN_LABELS } from '../../lib/bitMeta'
import { downloadCsv } from '../../lib/csv'
import { long } from '../../lib/duration'
import { useBitDialogs } from '../bits/bitDialogsContext'
import { BitCard } from './BitCard'
import { TypePills } from './TypePills'
import { useLibraryView } from './useLibraryView'

function exportCsv(bits: Bit[], topics: Topic[]) {
  const topicOf = (b: Bit) => topics.find((t) => t.id === b.topic_id)
  const headers = ['Setup', 'Punchline', 'Type', 'Topic', 'Subtopic', 'Rating', 'Status', 'Duration', 'Tags', 'Comments', 'Created At', 'Tag Lines', 'Clean', 'Language']
  const rows = bits.map((b) => [
    b.setup, b.punchline, b.types.join('; ') || 'Undefined', topicOf(b)?.name ?? '',
    topicOf(b)?.subtopics.find((s) => s.id === b.subtopic_id)?.name ?? '', b.strength, b.status ?? '',
    long(b.duration_seconds), b.hashtags.join(' '), b.comments, b.created_at, b.tag_lines.join(' | '),
    b.clean_rating ? CLEAN_LABELS[b.clean_rating] : '', b.language ?? '',
  ])
  downloadCsv(`jokebox_bits_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows)
}

export function LibraryPage() {
  const view = useLibraryView()
  const dialogs = useBitDialogs()
  useStatuses() // warm the cache so the editor opens instantly, even offline
  const addBit = () => dialogs.openEditor(undefined, { topicId: view.topic?.id, subtopicId: view.subtopic?.id })
  const title = view.subtopic?.name ?? view.topic?.name ?? 'All Bits'

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 lg:pt-8">
      <header className="space-y-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-faint">
          <Link to="/" className="hover:text-text">Home</Link>
          {view.topic && <><span>›</span><Link to={`/?topic=${view.topic.id}`} className={view.subtopic ? 'hover:text-text' : 'text-muted'}>{view.topic.name}</Link></>}
          {view.subtopic && <><span>›</span><span className="text-muted">{view.subtopic.name}</span></>}
        </nav>
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
          <div className="flex gap-2">
            <Button variant="ghost" icon={<Download size={16} />} onClick={() => exportCsv(view.visible, view.topics)} disabled={!view.visible.length}>
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <div className="hidden lg:block">
              <Button variant="primary" icon={<Plus size={18} />} onClick={addBit}>New bit</Button>
            </div>
          </div>
        </div>
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-faint" />
          <Input type="search" aria-label="Search bits" placeholder="Search setups, punchlines, tags…" className="pl-10" value={view.q} onChange={(e) => view.setQuery(e.target.value)} />
        </div>
        <TypePills types={view.folderTypes} active={view.type} onPick={view.setType} />
      </header>

      <section className="mt-6">
        {view.isPending ? (
          <div className="py-20"><Spinner label="Opening the vault…" /></div>
        ) : view.visible.length === 0 ? (
          <EmptyState icon={<Layers size={24} />} title="No bits here yet">
            {view.q || view.type !== 'All' ? 'Nothing matches that search or filter.' : 'Tap + to capture your first bit in this folder.'}
          </EmptyState>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
            {view.visible.map((bit) => <BitCard key={bit.id} bit={bit} topicName={view.topics.find((t) => t.id === bit.topic_id)?.name} />)}
          </div>
        )}
      </section>

      {/* Floating capture button on phones, kept clear of the tab bar. */}
      <button type="button" onClick={addBit} aria-label="New bit" className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 inline-flex size-14 items-center justify-center rounded-2xl bg-accent text-black shadow-pop active:bg-accent-press lg:hidden">
        <Plus size={26} />
      </button>
    </div>
  )
}
