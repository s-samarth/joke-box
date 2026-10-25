/** The watchlist: routines to study, ticked off as you watch them. */
import { BookOpen, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useAnalyses, useDeleteWatchItem, useSaveWatchItem, useWatchlist } from '../../api/study'
import type { WatchItem } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { EmptyState, PageHead, Spinner } from '../../components/ui/pieces'
import { Input } from '../../components/ui/Field'
import { useFeedback } from '../../components/ui/feedbackContext'
import { AddRoutineSheet } from './AddRoutineSheet'
import { WatchRow } from './WatchRow'
import { SCORES, filterItems, groupByCategory, guideFor, toInput, type WatchFilter } from './watchMeta'

const FILTERS: [WatchFilter, string][] = [['all', 'All'], ['todo', 'To watch'], ['watched', 'Watched']]
const chip = (on: boolean) => `h-8 shrink-0 rounded-lg px-3 text-sm transition ${on ? 'bg-paper font-medium text-ink' : 'bg-ink-3 text-dim hover:text-paper'}`

export function WatchlistPage() {
  const { data: items = [], isPending } = useWatchlist()
  const { data: analyses = [] } = useAnalyses()
  const save = useSaveWatchItem()
  const del = useDeleteWatchItem()
  const { confirm, toast } = useFeedback()
  const [filter, setFilter] = useState<WatchFilter>('all')
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const watched = items.filter((i) => i.watched).length
  const groups = groupByCategory(items, filterItems(items, filter, query))

  const toggle = (item: WatchItem) => save.mutate({ id: item.id, input: { ...toInput(item), watched: !item.watched } }, { onError: (e) => toast(`Not saved: ${e.message}`) })
  const remove = async (item: WatchItem) => {
    if (await confirm({ title: `Remove ${item.title}?`, message: 'It goes to the Trash for 30 days. Analyses you wrote about it stay.', confirmLabel: 'Remove', danger: true })) del.mutate(item.id)
  }

  if (isPending) return <div className="py-16"><Spinner /></div>

  return (
    <div className="mx-auto max-w-2xl">
      <PageHead title="Watchlist">
        <Button small icon={<Plus size={16} />} onClick={() => setAdding(true)}>Add routine</Button>
      </PageHead>

      {items.length === 0 ? (
        <EmptyState title="Nothing to watch yet"
          action={<Button variant="tape" icon={<Plus size={16} />} onClick={() => setAdding(true)}>Add routine</Button>}>
          Add the routines you want to study, grouped by category. Score each for Schemer Index, Logic Density and Dark Pragmatism, then tick it off once you've watched it.
        </EmptyState>
      ) : (
        <>
          <div className="space-y-2">
            <p className="flex items-baseline justify-between"><span className="text-lg"><span className="font-semibold tabular">{watched}</span> of {items.length} watched</span><span className="text-sm text-faint tabular">{Math.round((watched / items.length) * 100)}%</span></p>
            <div className="h-1.5 overflow-hidden rounded-full bg-ink-3"><div className="h-full rounded-full bg-ok transition-[width]" style={{ width: `${(watched / items.length) * 100}%` }} /></div>
            <details className="text-sm text-faint">
              <summary className="cursor-pointer select-none hover:text-dim">What do SI, LD and DP mean?</summary>
              <dl className="mt-2 space-y-1.5">{SCORES.map((s) => <div key={s.key}><dt className="inline text-dim">{s.short}, {s.name}: </dt><dd className="inline">{s.hint}</dd></div>)}</dl>
            </details>
          </div>

          <div className="mt-6 space-y-3">
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
              <Input type="search" aria-label="Search the watchlist" placeholder="Search routines, comics, categories" className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="flex gap-1.5" role="group" aria-label="Show">
              {FILTERS.map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={chip(filter === key)}>{label}</button>)}
            </div>
          </div>

          {groups.length === 0 && <p className="mt-8 text-dim">{filter === 'watched' && !query ? 'Nothing ticked off yet.' : 'No routines match.'}</p>}
          {groups.map((g) => {
            const guide = guideFor(g.category, analyses)
            return (
            <section key={g.category} className="mt-8">
              <h2 className="flex items-baseline justify-between gap-3 border-b border-rule pb-2">
                <span className="headline text-2xl">{g.category}</span>
                <span className="shrink-0 text-sm text-faint tabular">{g.watched}/{g.total} watched</span>
              </h2>
              {guide && (
                <Link to={`/analysis/${guide.id}`} className="mt-2 inline-flex items-center gap-1.5 text-sm text-tape hover:underline">
                  <BookOpen size={15} /> Read the guide
                </Link>
              )}
              <ul className="divide-y divide-rule">{g.items.map((i) => <WatchRow key={i.id} item={i} onToggle={() => toggle(i)} onDelete={() => void remove(i)} />)}</ul>
            </section>
            )
          })}
        </>
      )}
      {adding && <AddRoutineSheet items={items} onClose={() => setAdding(false)} />}
    </div>
  )
}
