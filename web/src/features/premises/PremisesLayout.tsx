/**
 * Premises, a tab of their own: a searchable list on the left and the open premise beside it, like
 * Jokes. Built to stay usable with hundreds of premises: search the take and notes, narrow to a
 * topic, sort by size. On a phone the list gives way to the premise you open.
 */
import { Lightbulb, Plus, Search, X } from 'lucide-react'
import { useRef } from 'react'
import { Link, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { useTopics } from '../../api/library'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { Dropdown, type MenuItem } from '../../components/ui/Menu'
import { EmptyState, PageHead, Spinner } from '../../components/ui/pieces'
import { topicName } from '../../lib/jokeMeta'
import { NO_PREMISE, premiseSize } from '../../lib/premises'
import { MenuButton } from '../jokes/JokeFilters'
import { NewPremiseDialog } from './NewPremiseDialog'
import { PremiseGuide } from './PremiseGuide'
import { PREMISE_SORTS, usePremiseFilters, type PremiseSort } from './usePremiseFilters'

export function PremisesLayout() {
  const { premiseId } = useParams()
  const f = usePremiseFilters()
  const { data: topics = [] } = useTopics()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  // The New dialog's open state lives in the URL (?new=1), so the + button can open it from anywhere on Premises.
  const creating = params.has('new')
  const setCreating = (open: boolean) => setParams((p) => { if (open) p.set('new', '1'); else p.delete('new'); return p }, { replace: true })
  // Creating navigates to the new premise (which drops ?new=1); the dialog's own close that follows mustn't navigate back.
  const created = useRef(false)
  // Links to a premise keep the list's filters, but not the open dialog.
  const kept = new URLSearchParams(useLocation().search)
  kept.delete('new')
  const search = kept.size ? `?${kept}` : ''
  const topic = topics.find((t) => t.id === f.topic)
  const topicItems: MenuItem[] = [
    { label: 'All topics', onSelect: () => f.set({ topic: null }), checked: !f.topic },
    ...topics.map((t) => ({ label: topicName(t), onSelect: () => f.set({ topic: t.id }), checked: f.topic === t.id })),
  ]
  const sortItems: MenuItem[] = (Object.keys(PREMISE_SORTS) as PremiseSort[]).map((k) => ({ label: PREMISE_SORTS[k], onSelect: () => f.set({ sort: k === 'topic' ? null : k }), checked: f.sort === k }))
  // Sorted by topic, a small heading starts each topic's run.
  const headingAt = (i: number) => f.sort === 'topic' && (i === 0 || f.visible[i - 1].topic_id !== f.visible[i].topic_id)

  return (
    <div className="lg:-mx-10 lg:flex lg:h-dvh">
      <section className={`lg:flex lg:w-[26rem] lg:shrink-0 lg:flex-col lg:border-r lg:border-rule lg:px-6 ${premiseId ? 'hidden lg:flex' : ''}`}>
        <PageHead title="Premises">
          <Button variant="tape" small icon={<Plus size={15} />} onClick={() => setCreating(true)}>New</Button>
        </PageHead>
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
          <Input type="search" aria-label="Search premises" placeholder="Search takes and notes" className="pl-10" value={f.q} onChange={(e) => f.set({ q: e.target.value })} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Dropdown align="start" items={topicItems} trigger={<span><MenuButton label={topic ? topicName(topic) : 'Topic'} on={Boolean(topic)} /></span>} />
          <Dropdown align="start" items={sortItems} trigger={<span><MenuButton label={PREMISE_SORTS[f.sort]} on={false} /></span>} />
          {f.active && <button type="button" onClick={() => f.set({ q: null, topic: null })} className="inline-flex h-9 items-center gap-1 px-2 text-sm text-dim hover:text-paper"><X size={14} /> Clear</button>}
        </div>
        <p className="mt-4 mb-1 text-sm text-faint">
          {f.active ? `${f.visible.length} of ${f.total} premises` : `${f.total} premises`}
          {f.loose > 0 && <> · <Link to={`/jokes?premise=${NO_PREMISE}`} className="text-tape hover:underline">{f.loose} {f.loose === 1 ? 'joke' : 'jokes'} on none yet</Link></>}
        </p>
        <div className="lg:-mx-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-3">
          {f.isPending ? (
            <div className="py-10"><Spinner /></div>
          ) : f.visible.length === 0 ? (
            <EmptyState title={f.active ? 'Nothing matches' : 'No premises yet'}
              action={!f.active && <button type="button" onClick={() => setCreating(true)} className="text-tape hover:underline">Write your first premise</button>}>
              {f.active ? 'Try another word or clear the filters.' : 'Your take on a topic, with the jokes that rest on it.'}
            </EmptyState>
          ) : (
            <ul className="pb-10">
              {f.visible.map((p, i) => (
                <li key={p.id}>
                  {headingAt(i) && <h3 className="px-3 pt-4 pb-1 text-xs text-faint">{topicName(topics.find((t) => t.id === p.topic_id))}</h3>}
                  <Link to={`/premises/${p.id}${search}`} aria-current={p.id === premiseId ? 'page' : undefined}
                    className={`flex items-start gap-3 rounded-lg px-3 py-3 ${p.id === premiseId ? 'bg-ink-3' : 'hover:bg-ink-2'}`}>
                    <Lightbulb size={16} className={`mt-1 shrink-0 ${(f.counts.get(p.id) ?? 0) >= 3 ? 'text-tape' : 'text-faint'}`} aria-hidden />
                    <span className="min-w-0 flex-1 leading-snug">
                      <span className="line-clamp-2">{p.take}</span>
                      <span className="mt-0.5 block text-xs text-faint">
                        {premiseSize(f.counts.get(p.id) ?? 0)}{f.sort !== 'topic' && ` · ${topicName(topics.find((t) => t.id === p.topic_id))}`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <section className={`min-w-0 flex-1 lg:overflow-y-auto lg:px-10 ${premiseId ? '' : 'hidden lg:block'}`}>
        <Outlet />
      </section>
      <NewPremiseDialog open={creating} onOpenChange={(open) => (created.current && !open ? (created.current = false) : setCreating(open))} topicId={f.topic}
        onCreated={(id) => { created.current = true; navigate(`/premises/${id}${search}`) }} />
    </div>
  )
}

/** With no premise open, desktop shows how to write a good one. */
export function NoPremiseSelected() {
  return (
    <div className="mx-auto max-w-2xl pt-10 pb-16">
      <h2 className="headline text-4xl">Writing a premise</h2>
      <div className="mt-4"><PremiseGuide open /></div>
    </div>
  )
}
