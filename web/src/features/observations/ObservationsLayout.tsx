/**
 * Observations, like Premises: a searchable list with the open observation beside it (see
 * SplitView); on a phone the list gives way to the one you open. Filter by topic and kind, or to
 * the ones nothing has come from yet; all of it lives in the URL (?topic=, ?kind=, ?unused=1,
 * ?q=). New opens a sheet (?new=1, so the + button can open it too).
 */
import { Eye, Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { useTopics } from '../../api/library'
import { useObservationKinds, useObservations } from '../../api/notebook'
import type { Observation } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { ChipRow } from '../../components/ui/ChipRow'
import { Input } from '../../components/ui/Field'
import { EmptyState, PageHead, Spinner } from '../../components/ui/pieces'
import { SplitView, WIDE_LIST } from '../../components/ui/SplitView'
import { matchesWords } from '../../lib/search'
import { formatDate } from '../../lib/time'
import { count } from '../../lib/topics'
import { KindManager } from './KindManager'
import { NewObservationDialog } from './NewObservationDialog'
import { KindMenu, TopicMenu } from './ObservationMenus'
import { kindLabel, matchesFilters, NOT_SORTED, PLAIN, PLAIN_KIND, topicLabel } from './observationMeta'
import { useUses } from './useUsed'

const newest = (a: Observation, b: Observation) => b.created_at.localeCompare(a.created_at)
const chip = (on: boolean) => `inline-flex h-9 shrink-0 items-center rounded-lg px-3 text-sm transition ${on ? 'bg-paper font-medium text-ink' : 'bg-ink-3 text-dim hover:text-paper'}`

export function ObservationsLayout() {
  const { observationId } = useParams()
  const { data: observations, isPending } = useObservations()
  const { data: topics = [] } = useTopics()
  const { data: kinds = [] } = useObservationKinds()
  const uses = useUses()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [managing, setManaging] = useState(false)
  const setParam = (name: string, value: string | null) => setParams((p) => { if (value) p.set(name, value); else p.delete(name); return p }, { replace: true })
  const topic = params.get('topic')
  const kind = params.get('kind')
  const unused = params.get('unused') === '1'
  const query = params.get('q') ?? ''
  const kept = new URLSearchParams(useLocation().search)
  kept.delete('new')
  const search = kept.size ? `?${kept}` : ''
  const all = [...(observations ?? [])].sort(newest)
  const open = (o: Observation) => !(unused && uses.used(o))
  const shown = all.filter((o) => matchesFilters(o, topic, kind) && open(o) && matchesWords(query, [o.text]))
  const active = Boolean(topic || kind || unused || query.trim())
  // Each menu counts within the other filters, so the numbers match what picking would show.
  const topicCount = (v: string | null) => all.filter((o) => matchesFilters(o, v, kind) && open(o)).length
  const kindCount = (v: string | null) => all.filter((o) => matchesFilters(o, topic, v) && open(o)).length
  const filedUnder = (value: string | null, none: string) => (value && value !== none ? value : null)
  const about = (o: Observation) => [topicLabel(topics, o.topic_id) ?? 'No topic', o.kind_id && kindLabel(kinds, o.kind_id)].filter((x) => x && x !== PLAIN).join(' · ')

  const list = (
    <>
      <PageHead title="Observations">
        <Button variant="tape" small icon={<Plus size={15} />} onClick={() => setParam('new', '1')}>New</Button>
      </PageHead>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
        <Input type="search" aria-label="Search observations" placeholder="Search observations" className="pl-10" value={query} onChange={(e) => setParam('q', e.target.value)} />
      </div>
      <ChipRow className="mt-3 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <TopicMenu value={topic} onChange={(v) => setParam('topic', v)} counts={topicCount} />
        <KindMenu value={kind} onChange={(v) => setParam('kind', v)} counts={kindCount} onManage={() => setManaging(true)} />
        <button type="button" aria-pressed={unused} onClick={() => setParam('unused', unused ? null : '1')} className={chip(unused)}>Not used yet</button>
      </ChipRow>
      <p className="mt-4 mb-1 text-sm text-faint">{active ? `${shown.length} of ${count(all.length, 'observation', 'observations')}` : count(all.length, 'observation', 'observations')}</p>
      <div className="lg:-mx-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-3">
        {isPending && !observations ? (
          <div className="py-10"><Spinner /></div>
        ) : shown.length === 0 ? (
          <EmptyState title={active ? 'Nothing matches' : 'No observations yet'}
            action={!active && <button type="button" onClick={() => setParam('new', '1')} className="text-tape hover:underline">Log your first one</button>}>
            {active ? 'Try another word or change the filters.' : 'The next weird thing you see, log it before it fades.'}
          </EmptyState>
        ) : (
          <ul className={`pb-10 ${observationId ? '' : WIDE_LIST}`}>
            {shown.map((o) => (
              <li key={o.id}>
                <Link to={`/observations/${o.id}${search}`} viewTransition={!observationId} aria-current={o.id === observationId ? 'page' : undefined}
                  className={`flex items-start gap-3 rounded-lg px-3 py-3 ${o.id === observationId ? 'bg-ink-3' : 'hover:bg-ink-2'}`}>
                  <Eye size={16} className={`mt-1 shrink-0 ${uses.used(o) ? 'text-tape' : 'text-faint'}`} aria-hidden />
                  <span className="min-w-0 flex-1 leading-snug">
                    <span className="line-clamp-3">{o.text}</span>
                    <span className="mt-1 block text-xs text-faint">{about(o)} · {uses.label(o)} · {formatDate(o.created_at)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )

  return (
    <>
      <SplitView list={list} openId={observationId} closeTo={`/observations${search}`} noun="observation"><Outlet /></SplitView>
      {params.has('new') && (
        <NewObservationDialog onClose={() => setParam('new', null)} topicId={filedUnder(topic, NOT_SORTED)} kindId={filedUnder(kind, PLAIN_KIND)}
          onCreated={(id) => navigate(`/observations/${id}${search}`)} />
      )}
      {managing && <KindManager onClose={() => setManaging(false)} />}
    </>
  )
}

/** With none open, a wide screen says what an observation's page holds. */
export function NoObservationSelected() {
  return (
    <div className="mx-auto max-w-2xl pt-10 pb-16">
      <h2 className="headline text-4xl">Observations</h2>
      <p className="mt-4 text-[15px] leading-relaxed text-dim">
        Open one to give it a topic and a kind (both optional), and to link the jokes and premises that came from it, or write a new one from it.
      </p>
    </div>
  )
}
