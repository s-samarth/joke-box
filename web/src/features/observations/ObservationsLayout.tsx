/**
 * Observations, like Premises: a searchable list with the open observation beside it (see
 * SplitView); on a phone the list gives way to the one you open. Filter by topic and kind, or to
 * status, or the ones nothing has come from yet, and sort by date or strength; all of it lives in the URL
 * (?topic=, ?kind=, ?status=, ?unused=1, ?q=, ?sort=) and is remembered for a while like Jokes' (lib/useRememberedParams), so the tab bar brings
 * you back to it. New opens a sheet (?new=1, so the + button can open it too).
 */
import { Eye, Plus, Search, X } from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { useTopics } from '../../api/library'
import { useObservationKinds, useObservations } from '../../api/notebook'
import { PREMISE_STATUSES, premiseStatus } from '../../api/premises'
import type { Observation } from '../../api/types'
import { Button } from '../../components/ui/Button'
import { ChipRow } from '../../components/ui/ChipRow'
import { Input } from '../../components/ui/Field'
import { Dropdown, type MenuItem } from '../../components/ui/Menu'
import { EmptyState, PageHead, Spinner, StrengthTicks } from '../../components/ui/pieces'
import { SplitView, WIDE_LIST } from '../../components/ui/SplitView'
import { matchesWords } from '../../lib/search'
import { formatDate } from '../../lib/time'
import { useRememberedParams } from '../../lib/useRememberedParams'
import { count } from '../../lib/topics'
import { KindManager } from './KindManager'
import { NewObservationDialog } from './NewObservationDialog'
import { KindMenu, TopicMenu } from './ObservationMenus'
import { MenuButton } from '../jokes/JokeFilters'
import { kindLabel, matchesFilters, OBSERVATION_SORTS, observationSort, PLAIN, PLAIN_KIND, sortObservations, topicLabel, type ObservationSort } from './observationMeta'
import { useUses } from './useUsed'
import { PremiseStatusTag } from '../premises/PremiseStatusPicker'
import { IdeasSwitch } from '../../layout/IdeasSwitch'

const chip = (on: boolean) => `inline-flex h-9 shrink-0 items-center rounded-lg px-3 text-sm transition ${on ? 'bg-paper font-medium text-ink' : 'bg-ink-3 text-dim hover:text-paper'}`

export function ObservationsLayout() {
  const { observationId } = useParams()
  const { data: observations, isPending } = useObservations()
  const { data: topics = [] } = useTopics()
  const { data: kinds = [] } = useObservationKinds()
  const uses = useUses()
  // ?new=1 is the open New sheet, not a filter.
  const { params, update } = useRememberedParams('observations-filters', ['new'])
  const navigate = useNavigate()
  const [managing, setManaging] = useState(false)
  const setParam = (name: string, value: string | null) => update((p) => { if (value) p.set(name, value); else p.delete(name) })
  const clear = () => update((p) => { for (const name of ['topic', 'kind', 'unused', 'status', 'q']) p.delete(name) })
  // An old ?topic=none (Not sorted, now gone) or a deleted topic's id reads as all topics.
  const topicParam = params.get('topic')
  const topic = topicParam && topics.some((t) => t.id === topicParam) ? topicParam : null
  const kind = params.get('kind')
  const unused = params.get('unused') === '1'
  const statusParam = params.get('status')
  const status = statusParam ? premiseStatus(statusParam) : null
  const query = params.get('q') ?? ''
  const sort = observationSort(params.get('sort'))
  const kept = new URLSearchParams(useLocation().search)
  kept.delete('new')
  const search = kept.size ? `?${kept}` : ''
  const all = sortObservations(observations ?? [], sort)
  const open = (o: Observation) => !(unused && uses.used(o)) && (!status || premiseStatus(o.status) === status)
  const shown = all.filter((o) => matchesFilters(o, topic, kind) && open(o) && matchesWords(query, [o.text]))
  const active = Boolean(topic || kind || unused || status || query.trim())
  // Each menu counts within the other filters, so the numbers match what picking would show.
  const topicCount = (v: string | null) => all.filter((o) => matchesFilters(o, v, kind) && open(o)).length
  const kindCount = (v: string | null) => all.filter((o) => matchesFilters(o, topic, v) && open(o)).length
  const statusItems: MenuItem[] = [
    { label: 'Any status', onSelect: () => setParam('status', null), checked: !status },
    ...PREMISE_STATUSES.map((s) => ({ label: s, onSelect: () => setParam('status', s), checked: status === s })),
  ]
  const sortItems: MenuItem[] = (Object.keys(OBSERVATION_SORTS) as ObservationSort[]).map((k) => ({ label: OBSERVATION_SORTS[k], onSelect: () => setParam('sort', k === 'new' ? null : k), checked: sort === k }))
  const about = (o: Observation) => [topicLabel(topics, o.topic_id), o.kind_id && kindLabel(kinds, o.kind_id)].filter((x) => x && x !== PLAIN).join(' · ')

  const list = (
    <>
      <IdeasSwitch />
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
        <Dropdown align="start" items={statusItems} trigger={<span><MenuButton label={status ?? 'Status'} on={Boolean(status)} /></span>} />
        <button type="button" aria-pressed={unused} onClick={() => setParam('unused', unused ? null : '1')} className={chip(unused)}>Not used yet</button>
        <Dropdown align="start" items={sortItems} trigger={<span><MenuButton label={OBSERVATION_SORTS[sort]} on={false} /></span>} />
        {active && <button type="button" onClick={clear} className="inline-flex h-9 shrink-0 items-center gap-1 px-2 text-sm text-dim hover:text-paper"><X size={14} /> Clear</button>}
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
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
                      <span>{about(o)} · {uses.label(o)} · {formatDate(o.created_at)}</span>
                      <StrengthTicks strength={o.strength} />
                      <PremiseStatusTag status={premiseStatus(o.status)} />
                    </span>
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
        <NewObservationDialog onClose={() => setParam('new', null)} topicId={topic} kindId={kind === PLAIN_KIND ? null : kind}
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
